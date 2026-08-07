import './global.css';
import { Uniwind } from 'uniwind';
// After uniwind's entry (it reaches into uniwind's own `Text`, so let uniwind
// initialise first) and before `./App`, which is where the screen modules that
// capture `Text` get pulled in.
import './src/utils/rtlText';
import { registerRootComponent } from 'expo';

import App from './App';

Uniwind.setTheme('dark');

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
