import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    watch: {
      // 교과서 PDF와 백업 폴더는 감시하지 않음
      ignored: ['**/backup-before-reset/**', '**/*.pdf'],
    },
  },
});
