export function setupLogger() {
  return {
    info: (message: string) => {
      console.log(`[${new Date().toISOString()}] INFO: ${message}`);
    },
  };
}
