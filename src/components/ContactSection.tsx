import ContactForm from './ContactForm';
import styles from './ContactSection.module.css';

const PHONE = '+2348162465247';
const PHONE_DISPLAY = '+234 816 246 5247';
const EMAIL = 'Promptiq2026@gmail.com';
const WHATSAPP_URL = `https://wa.me/${PHONE.replace('+', '')}`;

export default function ContactSection() {
  return (
    <section id="contact" className={styles.section}>
      <div className={`container ${styles.grid}`}>
        <div>
          <p className="eyebrow">Start a project</p>
          <h2 className={styles.heading}>Tell us what you want made.</h2>
          <p className={styles.sub}>
            Send a brief, or reach out directly — whichever is faster for you.
          </p>

          <ul className={styles.direct}>
            <li>
              <a href={WHATSAPP_URL} target="_blank" rel="noreferrer">
                WhatsApp — {PHONE_DISPLAY}
              </a>
            </li>
            <li>
              <a href={`mailto:${EMAIL}`}>{EMAIL}</a>
            </li>
          </ul>
        </div>

        <ContactForm />
      </div>
    </section>
  );
}
