const SERVICE_ID = 'service_a44azj5';
const TEMPLATE_ID = 'template_pibrxxh';
const PUBLIC_KEY = 'QpHeVpp0fxMKPmlJk';

export async function sendBookingEmail({ name, email, bookingId, space, vehicleReg }) {
  const res = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      service_id: SERVICE_ID,
      template_id: TEMPLATE_ID,
      user_id: PUBLIC_KEY,
      template_params: {
        to_email: email,
        to_name: name,
        booking_id: bookingId,
        space: space.label,
        vehicle_reg: vehicleReg,
      },
    }),
  });
  const text = await res.text();
console.log('EmailJS response:', res.status, text);
if (!res.ok) throw new Error(text);
}