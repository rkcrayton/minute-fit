/**
 * Mock for twrnc (Tailwind React Native Classnames).
 * Returns an empty style object for all class strings so components
 * can render in tests without the actual Tailwind engine.
 */
const tw = (..._args: any[]): Record<string, unknown> => ({});

// Support tagged template literal usage: tw`flex-row items-center`
Object.assign(tw, {
  style: (..._args: any[]) => ({}),
});

export default tw;
module.exports = tw;
module.exports.default = tw;
