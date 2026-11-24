const booking = document.querySelector('#booking');
const form = document.querySelector('#request');
const ready = document.querySelector('#request-ready');
const message = document.querySelector('#message');
const status = document.querySelector('#copy-status');
const lightbox = document.querySelector('#lightbox');
const localDate = new Date();
localDate.setMinutes(localDate.getMinutes() - localDate.getTimezoneOffset());
form.elements.date.min = localDate.toISOString().slice(0, 10);

let topic = '';
let seatingPlan = '';
document.querySelectorAll('[data-book]').forEach((button) => {
  button.addEventListener('click', () => {
    form.hidden = false;
    form.style.removeProperty('display');
    ready.hidden = true;
    status.textContent = '';
    topic = button.dataset.topic || '';
    seatingPlan = button.dataset.plan || '';
    if (button.dataset.count) form.elements.guests.value = button.dataset.count;
    if (button.dataset.event) form.elements.event.value = button.dataset.event;
    if (button.dataset.hall) form.elements.hall.value = button.dataset.hall;
    booking.showModal();
  });
});

form.addEventListener('submit', (event) => {
  event.preventDefault();
  const values = new FormData(form);
  const date = values.get('date').split('-').reverse().join('.');
  const hall = values.get('hall');
  message.value = [
    'Здравствуйте! Подскажите, пожалуйста, свободна ли дата для банкета?',
    'Формат: ' + values.get('event'),
    'Дата: ' + date,
    'Число гостей: ' + values.get('guests'),
    'Зал: ' + hall,
    seatingPlan ? 'Пожелание по рассадке: ' + seatingPlan.toLowerCase() + '.' : '',
    topic ? 'Пришлите, пожалуйста, актуальное банкетное меню.' : '',
  ].filter(Boolean).join('\n');
  form.hidden = true;
  form.style.display = 'none';
  ready.hidden = false;
  message.focus();
});

document.querySelector('#copy').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(message.value);
    status.textContent = 'Запрос скопирован.';
  } catch {
    message.select();
    status.textContent = 'Текст выделен. Скопируйте его вручную.';
  }
});

document.querySelectorAll('[data-photo]').forEach((button) => {
  button.addEventListener('click', () => {
    const image = lightbox.querySelector('img');
    image.src = 'assets/' + button.dataset.photo + '.jpg';
    image.alt = button.dataset.caption;
    lightbox.querySelector('p').textContent = button.dataset.caption;
    lightbox.showModal();
  });
});

for (const dialog of [booking, lightbox]) {
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });
}

const tabs = [...document.querySelectorAll('[data-menu-tab]')];
tabs.forEach((button) => {
  button.addEventListener('click', () => {
    tabs.forEach((tab) => {
      const selected = tab === button;
      tab.setAttribute('aria-pressed', String(selected));
      document.getElementById(tab.dataset.menuTab).hidden = !selected;
    });
  });
});
