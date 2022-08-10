const PaymentCustomer = require('../../../../models/paymentCustomer');
const stripe = require('stripe')(process.env.STRIPE_TEST_SECRET_KEY);

const getTitlePrice = async () => {
  return await stripe.prices.retrieve(process.env.DVD_RENT_PRICE_ID);
};

const getOrCreatePaymentCustomer = async (userEmail) => {
  const savedPaymentCustomer = await PaymentCustomer.findOne({
    email: userEmail,
  }).exec();
  if (!savedPaymentCustomer) {
    const customer = await stripe.customers.create({
      description: userEmail,
    });
    const paymentCustomer = new PaymentCustomer({
      email: userEmail,
      paymentCustomerIdStripe: customer.id,
    });
    await paymentCustomer.save();
    return paymentCustomer;
  }
  return savedPaymentCustomer;
};

const getActiveSubscriptionInfo = async (savedPaymentCustomer) => {
  const subscriptions = await stripe.subscriptions.list({
    customer: savedPaymentCustomer.paymentCustomerIdStripe,
  });

  if (subscriptions && subscriptions.data && subscriptions.data.length > 0) {
    const subscriptionData = subscriptions.data[0];
    if (
      subscriptionData.items &&
      subscriptionData.items.data &&
      subscriptionData.items.data.length > 0
    ) {
      const lookupKey = subscriptionData.items.data[0].price.lookup_key;
      const cancelAtDate = subscriptionData.cancel_at
        ? new Date(subscriptionData.cancel_at * 1000)
        : null;
      const currentPeriodEnd = subscriptionData.current_period_end
        ? new Date(subscriptionData.current_period_end * 1000)
        : null;
      return { lookupKey, cancelAtDate, currentPeriodEnd };
    }
  }
  return {};
};

module.exports = {
  getTitlePrice,
  getOrCreatePaymentCustomer,
  getActiveSubscriptionInfo,
};
