const { validationResult } = require('express-validator');

/**
 * 运行验证规则并统一返回错误
 */
const validate = (rules) => {
  return async (req, res, next) => {
    await Promise.all(rules.map((rule) => rule.run(req)));
    const errors = validationResult(req);
    if (errors.isEmpty()) return next();
    return res.status(422).json({
      code: 422,
      message: '参数验证失败',
      errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
    });
  };
};

module.exports = validate;
