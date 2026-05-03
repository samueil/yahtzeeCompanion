interface AppConfig {
  expo: { version: string };
}

const { expo } = require('../../app.json') as AppConfig;

/** Semantic version string from app.json (e.g. "1.0.1-dev"). */
export const APP_VERSION: string = expo.version;

/**
 * True for any pre-release build — i.e. the version string contains a
 * pre-release segment such as `-dev`.  Intended to gate developer overlays
 * that should appear in non-final production builds as well as local dev.
 */
export const IS_PRE_RELEASE: boolean = APP_VERSION.includes('-');
