const Joi = require('@hapi/joi');
const { tickets } = require('./shared-schema');

const reservationValidation = {
  /**
  * Validate create new ticket reservation data transfer object (DTO)
  * @return null if validation passes otherwise a validation error
  */
  validateTicketReservationDto(reservation) {
    const schema = Joi.object().keys({
      email: Joi.string().required(),
      matchNumber: Joi.number().strict().required(),
      tickets,
      cardNumber: Joi.string().required(),
      cardExpirationMonth: Joi.number().required(),
      cardExpirationYear: Joi.number().required(),
      cardCvc: Joi.string().required(),
    }).required().unknown(false);
    return schema.validate(reservation).error;
  },

};

module.exports = reservationValidation;