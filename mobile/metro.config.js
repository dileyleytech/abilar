// O app vive DENTRO do monorepo (pnpm), que tem outro node_modules acima com
// um react diferente. Sem fixar a resolução, o Metro pode puxar o react do
// pacote web (duplicado) → "Invalid hook call" em runtime. Trancamos a busca
// no node_modules do próprio app.
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

config.resolver.nodeModulesPaths = [path.resolve(__dirname, 'node_modules')];
config.resolver.disableHierarchicalLookup = true;

module.exports = config;
