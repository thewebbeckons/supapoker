export default defineAppConfig({
  ui: {
    colors: {
      primary: "blue",
      neutral: "zinc",
    },
    button: {
      slots: {
        base: 'cursor-pointer rounded-md font-medium inline-flex items-center justify-center gap-2 focus:outline-none focus-visible:outline-offset-2 transition-colors disabled:cursor-not-allowed disabled:opacity-75',
      },
    },
  },
});
