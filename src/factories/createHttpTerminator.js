// @flow

import type {
  HttpTerminatorType,
  HttpTerminatorConfigurationInputType,
} from '../types';
import createInternalHttpTerminator from './createInternalHttpTerminator';

export default (configurationInput: HttpTerminatorConfigurationInputType): HttpTerminatorType => {
  const httpTerminator = createInternalHttpTerminator(configurationInput);

  return {
    terminate: httpTerminator.terminate,
  };
};
