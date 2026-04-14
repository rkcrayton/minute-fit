/**
 * Mock for react-native-svg.
 * Renders plain Views so progress rings and other SVG-based components
 * can mount in the Jest/jsdom environment without native SVG support.
 */
import React from 'react';
import { View } from 'react-native';

const Svg = ({ children, ...props }: any) => <View {...props}>{children}</View>;
const Circle = (props: any) => <View {...props} />;
const Path = (props: any) => <View {...props} />;
const Rect = (props: any) => <View {...props} />;
const Line = (props: any) => <View {...props} />;
const G = ({ children, ...props }: any) => <View {...props}>{children}</View>;
const Text = ({ children, ...props }: any) => <View {...props}>{children}</View>;
const Defs = ({ children }: any) => <>{children}</>;
const LinearGradient = ({ children }: any) => <>{children}</>;
const Stop = () => null;

export default Svg;
export { Circle, Path, Rect, Line, G, Text, Defs, LinearGradient, Stop };
