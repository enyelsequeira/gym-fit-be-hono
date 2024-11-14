import { c as createPluginWithCommands, d as defaultPlugin } from './shared/eslint-plugin-command.b6374b7d.mjs';
import './shared/eslint-plugin-command.af5f4c89.mjs';
import '@es-joy/jsdoccomment';

function config(options = {}) {
  const plugin = options.commands ? createPluginWithCommands(options) : defaultPlugin;
  const {
    name = "command"
  } = options;
  return {
    name,
    plugins: {
      [name]: plugin
    },
    rules: {
      [`${name}/command`]: "error"
    }
  };
}

export { config as default };
