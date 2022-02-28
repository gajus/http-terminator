import {
  createFastifyServer,
} from '../../helpers/createFastifyServer';
import {
  createTests,
} from '../../helpers/createTests';

createTests(createFastifyServer);
