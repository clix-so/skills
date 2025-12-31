// React Native Clix SDK Integration Example
//
// This file is constructed directly from Clix SDK `search_sdk` sample source:
// - samples/BasicApp/index.js
//
// Note: In a real RN app, this code typically lives in your `index.js` / `index.ts` bootstrap file.

import Clix from '@clix-so/react-native-sdk';
import { AppRegistry } from 'react-native';

// These imports mirror the sample app structure:
import { name as appName } from './app.json';
import App from './src/App';
import config from './src/assets/clix_config.json';

Clix.initialize(config);

AppRegistry.registerComponent(appName, () => App);

