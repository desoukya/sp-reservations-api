const Joi = require('@hapi/joi');

exports.tickets = Joi.array().items(
  Joi.object().keys({
    category: Joi.number().valid(1, 2, 3).required(),
    quantity: Joi.number().min(1).max(2).required(),
    price: Joi.number().valid(75, 125, 195).required(),
  }).required()
).required().min(1).max(2);
