/**
 * @afenda/errors
 * Contract: afenda.errors/v1
 * Protected: changes require local pre-edit token and compatibility checks.
 */

export {
	badRequest,
	conflict,
	forbidden,
	internalError,
	notFound,
	rateLimited,
	serviceUnavailable,
	unauthorized,
	validationError,
} from "./common/index";
export {
	AppError,
	type AppErrorOptions,
	isAppError,
	isOperationalError,
} from "./core/app-error";
export {
	API_ERROR_CODES,
	type ApiErrorCode,
	type ApiErrorCodeBrand,
	asApiErrorCode,
	asErrorCode,
	ERROR_CODES,
	type ErrorCode,
	type ErrorCodeBrand,
	isApiErrorCode,
	isErrorCode,
} from "./core/codes";
export { normalizeUnknown } from "./core/normalize";
export {
	type SafeDetailScalar,
	type SafeDetails,
	type SafeDetailValue,
	sanitizeErrorDetails,
} from "./core/safe-details";
export {
	type SerializedAppError,
	serializeAppError,
	serializeUnknown,
} from "./core/serialize";
