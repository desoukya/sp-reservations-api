const Stripe = require('stripe');
const stripe = Stripe('sk_test_4eC39HqLyjWDarjtT1zdp7dc');
const { v4 } = require('uuid');
const db = require('../connectors/postgres');
const { sendKafkaMessage } = require('../connectors/kafka');
const { validateTicketReservationDto } = require('../validation/reservation');
const messagesType = require('../constants/messages');

module.exports = (app) => {
  // HTTP endpoint to test health performance of service
  app.get('/api/v1/health', async (req, res) => {
    return res.send('Service Health');
  });

  // HTTP endpoint to create new user
  app.post('/api/v1/reservation', async (req, res) => {
    try {
      // validate payload before proceeding with reservations
      const validationError = validateTicketReservationDto(req.body);
      if (validationError) {
        return res.status(403).send(validationError.message);
      }
      // Send message indicating ticket is pending checkout
      // so shop consumers can process message and call
      // sp-shop-api to decrement available ticket count
      await sendKafkaMessage(messagesType.TICKET_PENDING, {
        meta: { action: messagesType.TICKET_PENDING},
        body: { 
          matchNumber: req.body.matchNumber,
          tickets: req.body.tickets,
        }
      });
  
      // Perform Stripe Payment Flow
      try {
        const token = await stripe.tokens.create({
          card: {
            number: req.input.cardNumber,
            exp_month: req.input.cardExpirationMonth,
            exp_year: req.input.cardExpirationYear,
            cvc: req.input.cardCvc,
          },
        });
        await stripe.charges.create({
          amount: req.input.tickets.quantity * req.input.tickets.price,
          currency: 'usd',
          source: token,
          description: 'FIFA World Cup Ticket Reservation',
        });
        await sendKafkaMessage(messagesType.TICKET_RESERVED, {
          meta: { action: messagesType.TICKET_RESERVED},
          body: { 
            matchNumber: req.body.matchNumber,
            tickets: req.body.tickets,
          }
        });
      } catch (stripeError) {
        // Send cancellation message indicating ticket sale failed
        await sendKafkaMessage(messagesType.TICKET_CANCELLED, {
          meta: { action: messagesType.TICKET_CANCELLED},
          body: { 
            matchNumber: req.body.matchNumber,
            tickets: req.body.tickets,
          }
        });
        return res.status(400).send('could not process payment');
      }
      
      // Persist ticket sale in database with a generated reference id so user can lookup ticket
      const ticketReservation = { id: v4(), ...req.body };
      // const reservation = await db('reservations').insert(ticketReservation).returning('*');
  
      // Return success response to client
      return res.json({
        message: 'Ticket Purchase Successful',
        ...ticketReservation,
      });
    } catch (e) {
      return res.status(400).send(e.message);
    }
  });
};