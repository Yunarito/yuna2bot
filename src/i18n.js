import initialize from './initialize';

const de = require('./locales/de.json');
const en = require('./locales/en.json');

export const DEFAULT_LOCALE = 'de';

// Per-channel default locale for channels that haven't set one explicitly.
export const CHANNEL_LOCALES = {
    '#itzpinky_': 'en',
};

const locales = { de, en };

function getByPath(obj, path) {
    return path.split('.').reduce((node, part) => (node == null ? undefined : node[part]), obj);
}

export function getLocale(channel) {
    const channelInfo = initialize.channelsInfo[channel];
    if (channelInfo && channelInfo.locale) {
        return channelInfo.locale;
    }
    return CHANNEL_LOCALES[channel] || DEFAULT_LOCALE;
}

export function isSupportedLocale(locale) {
    return Object.prototype.hasOwnProperty.call(locales, locale);
}

export function setLocale(channel, locale) {
    if (!isSupportedLocale(locale)) {
        return false;
    }

    initialize.channelsInfo[channel].locale = locale;
    return true;
}

export function t(channel, key, vars = {}) {
    const locale = getLocale(channel);
    let template = getByPath(locales[locale], key);
    if (template === undefined) {
        template = getByPath(locales[DEFAULT_LOCALE], key);
    }
    if (template === undefined) {
        template = key;
    }

    return Object.keys(vars).reduce(
        (str, varName) => str.split(`{{${varName}}}`).join(vars[varName]),
        template
    );
}
