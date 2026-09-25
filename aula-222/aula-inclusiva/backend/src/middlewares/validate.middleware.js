import { validationResult } from "express-validator";

export const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const custom = errors.formatWith((err) => `${err.path}: ${err.msg}`);
    return res.status(400).json({ message: custom.array()[0], errors: custom.array() });
  }
  next();
};
