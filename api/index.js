require('dotenv').config();
const path = require('path');
const express = require('express');
const app = express();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { v4 } = require('uuid');
const db = require('../connectors/postgres');
const { sendKafkaMessage } = require('../connectors/kafka');
const { validateTicketReservationDto } = require('../validation/reservation');
const messagesType = require('../constants/messages');
const { startKafkaProducer } = require('../connectors/kafka');

// Config setup to parse JSON payloads from HTTP POST request body
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Register the api routes
// HTTP endpoint to test health performance of service
app.get('/api/health', async (req, res) => {
  return res.send('Service Health');
});

// HTTP endpoint to create new user
app.post('/api/reservation', async (req, res) => {
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
      meta: { action: messagesType.TICKET_PENDING },
      body: {
        matchNumber: req.body.matchNumber,
        tickets: req.body.tickets,
      }
    });

    // Perform Stripe Payment Flow
    try {
      const token = await stripe.tokens.create({
        card: {
          number: req.body.card.number,
          exp_month: req.body.card.expirationMonth,
          exp_year: req.body.card.expirationYear,
          cvc: req.body.card.cvc,
        },
      });
      await stripe.charges.create({
        amount: req.body.tickets.quantity * req.body.tickets.price,
        currency: 'usd',
        source: token.id,
        description: 'FIFA World Cup Ticket Reservation',
      });
      await sendKafkaMessage(messagesType.TICKET_RESERVED, {
        meta: { action: messagesType.TICKET_RESERVED },
        body: {
          matchNumber: req.body.matchNumber,
          tickets: req.body.tickets,
        }
      });
    } catch (stripeError) {
      // Send cancellation message indicating ticket sale failed
      await sendKafkaMessage(messagesType.TICKET_CANCELLED, {
        meta: { action: messagesType.TICKET_CANCELLED },
        body: {
          matchNumber: req.body.matchNumber,
          tickets: req.body.tickets,
        }
      });
      return res.status(400).send(`could not process payment: ${stripeError.message}`);
    }

    // Persist ticket sale in database with a generated reference id so user can lookup ticket
    const ticketReservation = {
      id: v4(),
      email: req.body.email,
      matchNumber: req.body.matchNumber,
      category: req.body.tickets.category,
      quantity: req.body.tickets.quantity,
      price: req.body.tickets.price,
    };
    await db('reservations').insert(ticketReservation);

    // Return success response to client
    return res.json({
      message: 'Ticket Purchase Successful',
      ...ticketReservation,
    });
  } catch (e) {
    return res.status(400).send(e.message);
  }
});

// If request doesn't match any of the above routes then return 404
app.use((req, res, next) => {
  return res.status(404).send();
});

// Create HTTP Server and Listen for Requests
app.listen(3000, async (req, res) => {
  // Start Kafka Producer
  await startKafkaProducer();
});
