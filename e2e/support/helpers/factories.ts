// Add data factories here, e.g. using @faker-js/faker
export const createTask = (overrides = {}) => ({
  title: "Test Task",
  completed: false,
  ...overrides,
});
