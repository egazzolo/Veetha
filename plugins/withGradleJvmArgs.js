const { withGradleProperties } = require('@expo/config-plugins');

const JVM_ARGS_KEY = 'org.gradle.jvmargs';
const JVM_ARGS_VALUE = '-Xmx4096m -XX:MaxMetaspaceSize=1024m -XX:+HeapDumpOnOutOfMemoryError';

module.exports = function withGradleJvmArgs(config) {
  return withGradleProperties(config, (config) => {
    const existing = config.modResults.find(
      (item) => item.type === 'property' && item.key === JVM_ARGS_KEY
    );
    if (existing) {
      existing.value = JVM_ARGS_VALUE;
    } else {
      config.modResults.push({ type: 'property', key: JVM_ARGS_KEY, value: JVM_ARGS_VALUE });
    }
    return config;
  });
};
