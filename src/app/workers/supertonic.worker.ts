import { pipeline, env } from '@huggingface/transformers';

// Configure Transformers.js environment for Web Worker
env.allowLocalModels = false;
env.allowRemoteModels = true;
if (env.backends?.onnx?.wasm) {
  env.backends.onnx.wasm.proxy = false;
  env.backends.onnx.wasm.numThreads = 1;
  env.backends.onnx.wasm.wasmPaths = '/onnxruntime-web/';
}

self.addEventListener('error', (err) => {
  console.error('[SupertonicWorker] Global worker error:', err);
});

let ttsPipeline: any = null;
let isInitializing = false;
let currentGenerationId: string | null = null;
// Serializes generate() calls — WASM/WebGPU is not re-entrant
let generationQueue: Promise<void> = Promise.resolve();
// Aggregate byte tracking for real overall download progress
const fileProgress: Record<string, { loaded: number; total: number }> = {};

addEventListener('message', async (event: MessageEvent) => {
  const { type, payload } = event.data || {};

  switch (type) {
    case 'INIT': {
      if (ttsPipeline) {
        postMessage({ type: 'READY' });
        return;
      }
      if (isInitializing) return;

      isInitializing = true;

      const loadPipeline = async (device: 'webgpu' | 'wasm', dtype: 'fp32' | 'q8') => {
        return pipeline('text-to-speech', 'onnx-community/Supertonic-TTS-2-ONNX', {
          device,
          dtype,
          progress_callback: (progressInfo: any) => {
            const key = progressInfo.file || progressInfo.name || 'unknown';
            if (progressInfo.status === 'progress' && progressInfo.total > 0) {
              fileProgress[key] = {
                loaded: progressInfo.loaded ?? 0,
                total: progressInfo.total,
              };
            }
            const entries = Object.values(fileProgress);
            const totalBytes = entries.reduce((s, e) => s + e.total, 0);
            const loadedBytes = entries.reduce((s, e) => s + e.loaded, 0);
            const aggregateProgress =
              totalBytes > 0 ? Math.min(100, Math.round((loadedBytes / totalBytes) * 100)) : 0;

            postMessage({
              type: 'PROGRESS',
              payload: {
                status: progressInfo.status,
                name: progressInfo.name || progressInfo.file,
                progress: aggregateProgress / 100,
                loaded: loadedBytes,
                total: totalBytes,
              },
            });
          },
        });
      };

      try {
        let device: 'webgpu' | 'wasm' = 'wasm';
        let dtype: 'fp32' | 'q8' = 'q8';

        // Probe WebGPU availability
        if (typeof navigator !== 'undefined' && 'gpu' in navigator && (navigator as any).gpu) {
          try {
            const adapter = await (navigator as any).gpu.requestAdapter();
            if (adapter) {
              device = 'webgpu';
              dtype = 'fp32';
            }
          } catch {
            // stay on wasm
          }
        }

        if (device === 'webgpu') {
          try {
            console.log('[SupertonicWorker] Trying WebGPU...');
            ttsPipeline = await loadPipeline('webgpu', 'fp32');
            console.log('[SupertonicWorker] WebGPU pipeline ready');
          } catch (gpuErr) {
            console.warn('[SupertonicWorker] WebGPU pipeline failed, falling back to WASM:', gpuErr);
            ttsPipeline = null;
            device = 'wasm';
            dtype = 'q8';
          }
        }

        if (!ttsPipeline) {
          console.log('[SupertonicWorker] Loading WASM/q8 pipeline...');
          ttsPipeline = await loadPipeline('wasm', 'q8');
          console.log('[SupertonicWorker] WASM pipeline ready');
        }

        isInitializing = false;
        postMessage({ type: 'READY', payload: { device } });
      } catch (err: any) {
        isInitializing = false;
        postMessage({
          type: 'ERROR',
          payload: { message: err?.message || 'Failed to initialize Supertonic TTS' },
        });
      }
      break;
    }

    case 'GENERATE': {
      const { id, text, voice = 'F1', speed = 1.0 } = payload || {};
      if (!text) return;

      if (!ttsPipeline) {
        postMessage({
          type: 'ERROR',
          payload: { id, message: 'TTS model is not initialized' },
        });
        return;
      }

      // Mark this as the latest request; previous in-queue requests will self-discard
      currentGenerationId = id;

      // Chain onto the queue — ensures only one generate() runs at a time
      generationQueue = generationQueue.then(async () => {
        if (currentGenerationId !== id) {
          console.log('[SupertonicWorker] Skipping stale request, id:', id);
          return;
        }

        console.log('[SupertonicWorker] Starting generate, id:', id, 'voice:', voice, 'text:', text.slice(0, 50));
        try {
          // Format text with language tag if not already provided
          const formattedText = text.startsWith('<') ? text : `<en>${text}</en>`;
          const speakerEmbeddingsUrl = `https://huggingface.co/onnx-community/Supertonic-TTS-2-ONNX/resolve/main/voices/${voice}.bin`;

          const output = await ttsPipeline(formattedText, {
            speaker_embeddings: speakerEmbeddingsUrl,
            num_inference_steps: 5,
            speed: Math.max(0.7, Math.min(1.4, speed)),
          });

          // Check again after async generate completes
          if (currentGenerationId !== id) {
            console.log('[SupertonicWorker] Stale result discarded, id:', id);
            return;
          }

          const rawData = output.audio;
          const floatArray: Float32Array =
            rawData instanceof Float32Array ? rawData : new Float32Array(rawData);
          const sampleRate: number = output.sampling_rate || 44100;

          console.log('[SupertonicWorker] Posting AUDIO, id:', id, 'samples:', floatArray.length, 'rate:', sampleRate);
          postMessage({
            type: 'AUDIO',
            payload: { id, sampleRate, samples: floatArray },
          });
        } catch (err: any) {
          console.error('[SupertonicWorker] Generate error, id:', id, err);
          if (currentGenerationId === id) {
            postMessage({
              type: 'ERROR',
              payload: { id, message: err?.message || 'Speech generation failed' },
            });
          }
        }
      });
      break;
    }

    case 'CANCEL': {
      currentGenerationId = null;
      break;
    }

    default:
      break;
  }
});
