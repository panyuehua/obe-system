/**
 * 标准化API响应格式
 */

const success = (res, data, message = 'success', statusCode = 200) => {
  return res.status(statusCode).json({
    code: 0,
    message,
    data,
  });
};

const created = (res, data, message = 'created') => {
  return success(res, data, message, 201);
};

const error = (res, message = 'error', statusCode = 400, errors = null) => {
  const body = { code: statusCode, message };
  if (errors) body.errors = errors;
  return res.status(statusCode).json(body);
};

const notFound = (res, message = '资源不存在') => {
  return error(res, message, 404);
};

const serverError = (res, message = '服务器内部错误') => {
  return error(res, message, 500);
};

module.exports = { success, created, error, notFound, serverError };
