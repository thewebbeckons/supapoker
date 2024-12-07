export default defineAppConfig({
  ui: {
    primary: "blue",
    gray: "cool",
    card: {
      ring: "ring-2 ring-gray-600 dark:ring-gray-800",
    },
    input: {
      color: {
        white: {
          outline:
            "shadow-lg rounded-full bg-white dark:bg-gray-900 text-gray-900 dark:text-white ring-2 ring-inset ring-gray-600 dark:ring-gray-700 focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400",
        },
      },
    },
  },
});
