import { take, put, call } from 'redux-saga/effects';
import { Map } from 'immutable';
import { handleActions } from 'redux-actions';
import { createSelector } from 'reselect';
import { actions as mergeEntitiesActions } from 'ui/redux/modules/models/mergeEntities';
import { normalize } from 'normalizr';
import entityReviver from 'ui/redux/modules/models/entityReviver';
import * as schemas from 'ui/utils/schemas';


const UPLOAD_PERSONAS = 'learninglocker/uploadpersona/UPLOAD_PERSONAS';
const UPLOAD_PERSONAS_RESET = 'learninglocker/uploadpersona/UPLOAD_PERSONAS_RESET';
const UPLOAD_PERSONAS_SUCCESS = 'learninglocker/uploadpersona/UPLOAD_PERSONAS_SUCCESS';
const UPLOAD_PERSONAS_FAILURE = 'learninglocker/uploadpersona/UPLOAD_PERSONAS_FAILURE';

const IN_PROGRESS = 'IN_PROGRESS';
const SUCCESS = 'SUCCESS';
const FAILED = 'FAILED';

/*
 * Selectors
 */

const rootSelector = state => state.uploadPersonas;

export const requestStateSelector = ({ id }) => createSelector(
  rootSelector,
  (state) => {
    return state.getIn([id, 'requestState']);
  }
);

/*
 * Actions
 */
export const uploadPersonas = ({ id, file }) => ({
  type: UPLOAD_PERSONAS,
  id,
  file,
});

export const uploadPersonasSuccess = ({ id, body }) => {
  // We want to update the model

  return ({
    type: UPLOAD_PERSONAS_SUCCESS,
    body,
    id
  });
};

export const uploadPersonasFailure = ({ id, err }) => ({
  type: UPLOAD_PERSONAS_FAILURE,
  error: err,
  id
});

export const uploadPersonasReset = ({ id }) => ({
  type: UPLOAD_PERSONAS_RESET,
  id
});

/*
 * Sagas
 */
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
function* uploadPersonasSaga() {

  while (true) {
    const { id, file, llClient } = yield take(UPLOAD_PERSONAS);
    const { body, status } = yield call(llClient.personasUpload, {
      id,
      file
    });

    if (status > 200 && status < 500) yield put(uploadPersonasFailure({ id, body }));
    else if (status >= 500) yield put(uploadPersonasFailure({ id, body }));
    else {
      yield put(uploadPersonasSuccess({ id, body }));

      const schemaClass = schemas.personasImport;

      const normalizedModels = normalize(body, schemaClass);
      const entities = entityReviver(normalizedModels);

      yield put(mergeEntitiesActions.mergeEntitiesAction(
        entities
      ));

      yield call(delay, 2000);
      yield put(uploadPersonasReset({ id }));
    }
  }
}

/*
 * Reducers
 */


const handler = handleActions({
  [UPLOAD_PERSONAS]: (state, { id }) =>
    state.setIn([id, 'requestState'], IN_PROGRESS),
  [UPLOAD_PERSONAS_SUCCESS]: (state, { id }) =>
    state.setIn([id, 'requestState'], SUCCESS),
  [UPLOAD_PERSONAS_FAILURE]: (state, { id }) => (
    state.setIn([id, 'requestState'], FAILED)
  ),
  [UPLOAD_PERSONAS_RESET]: (state, { id }) => (
    state.deleteIn([id, 'requestState'])
  ),
});

const initialState = {};
export default function reducer(state = initialState, action = {}) {
  if (!Map.isMap(state)) return reducer(new Map(state), action); // ensure immutability
  return handler(state, action);
}

export const sagas = [
  uploadPersonasSaga
];
