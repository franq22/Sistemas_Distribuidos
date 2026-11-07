import type { Config } from 'jest';
import { pathsToModuleNameMapper } from 'ts-jest';
import ts from 'typescript';

// Path aliases (e.g. the ones added by `nest g library`) live in tsconfig.json,
// so they are read from there instead of being duplicated here.
const { config: tsconfig } = ts.readConfigFile(
  './tsconfig.json',
  ts.sys.readFile,
);
const paths = tsconfig?.compilerOptions?.paths ?? {};

const config: Config = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: '.*\\.spec\\.ts$',
  extensionsToTreatAsEsm: ['.ts'],
  setupFiles: ['<rootDir>/test/jest-globals.ts'],
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: {
          module: 'esnext',
          moduleResolution: 'bundler',
        },
      },
    ],
  },
  moduleNameMapper: pathsToModuleNameMapper(paths, { prefix: '<rootDir>/' }),
  collectCoverageFrom: ['src/prestamos/prestamos.service.ts'],
  // 90% de líneas y 80% de ramas: se mide el servicio bajp prueba y se exige cubrir sus caminos principales sin imponer cobertura a módulos fuera de lo pedido
  coverageThreshold: { global: { lines: 90, branches: 80 } },
  coverageDirectory: './coverage',
  testEnvironment: 'node',
  watchman: false,
};

export default config;
