import { defineConfig } from 'orval'

const input = { target: './contract/openapi.json' }

export default defineConfig({
  api: {
    input,
    output: {
      client: 'react-query',
      httpClient: 'fetch',
      mode: 'tags-split',
      target: 'src/api/generated/endpoints',
      schemas: 'src/api/generated/model',
      clean: true,
      override: {
        mutator: { path: 'src/api/fetcher.ts', name: 'fetcher' },
        // Hooks return the response body; errors are thrown as ApiError by the fetcher.
        fetch: { includeHttpResponseReturnType: false, arrayFormat: 'repeat' },
      },
    },
  },
  zod: {
    input,
    output: {
      client: 'zod',
      mode: 'tags-split',
      target: 'src/api/generated/endpoints',
      fileExtension: '.zod.ts',
    },
  },
})
