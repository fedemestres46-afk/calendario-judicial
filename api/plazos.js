const NOTION_VERSION = '2022-06-28';

function notionHeaders() {
  return {
    Authorization: `Bearer ${process.env.NOTION_TOKEN}`,
    'Content-Type': 'application/json',
    'Notion-Version': NOTION_VERSION,
  };
}

function requireConfig() {
  if (!process.env.NOTION_TOKEN || !process.env.NOTION_PLAZOS_DATABASE_ID) {
    throw new Error('Faltan NOTION_TOKEN y/o NOTION_PLAZOS_DATABASE_ID.');
  }
}

function richText(value) {
  return [{ type: 'text', text: { content: String(value || '') } }];
}

function titleText(value) {
  return [{ type: 'text', text: { content: String(value || 'Plazo judicial') } }];
}

function plainText(prop) {
  if (!prop) return '';
  if (prop.type === 'title') return prop.title.map(part => part.plain_text).join('');
  if (prop.type === 'rich_text') return prop.rich_text.map(part => part.plain_text).join('');
  return '';
}

function numberValue(prop) {
  return prop && prop.type === 'number' ? prop.number : null;
}

function dateValue(prop) {
  return prop && prop.type === 'date' && prop.date ? prop.date.start : '';
}

function selectName(prop) {
  return prop && prop.type === 'select' && prop.select ? prop.select.name : '';
}

function toClientPage(page) {
  const props = page.properties || {};
  return {
    id: page.id,
    nombre: plainText(props.Plazo),
    cliente: plainText(props.Cliente),
    expediente: plainText(props.Expediente),
    tipo: selectName(props['Tipo de plazo']),
    evento: plainText(props['Evento que inicia plazo']),
    inicio: dateValue(props['Fecha de inicio']),
    dias: numberValue(props['Días hábiles']),
    vencimiento: dateValue(props.Vencimiento),
    estado: selectName(props.Estado),
    origen: selectName(props.Origen),
    observaciones: plainText(props.Observaciones),
  };
}

async function notionFetch(path, options = {}) {
  const response = await fetch(`https://api.notion.com/v1${path}`, {
    ...options,
    headers: notionHeaders(),
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(text || `Notion error ${response.status}`);
  }
  return text ? JSON.parse(text) : null;
}

async function listPlazos() {
  const pages = [];
  let cursor;
  do {
    const body = {
      page_size: 100,
      sorts: [{ property: 'Vencimiento', direction: 'ascending' }],
    };
    if (cursor) body.start_cursor = cursor;
    const data = await notionFetch(`/databases/${process.env.NOTION_PLAZOS_DATABASE_ID}/query`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
    pages.push(...data.results.map(toClientPage));
    cursor = data.has_more ? data.next_cursor : null;
  } while (cursor);
  return pages;
}

async function createPlazo(input) {
  const nombre = input.nombre || input.cliente || `Plazo ${input.dias || ''} días hábiles`;
  const data = await notionFetch('/pages', {
    method: 'POST',
    body: JSON.stringify({
      parent: { database_id: process.env.NOTION_PLAZOS_DATABASE_ID },
      properties: {
        Plazo: { title: titleText(nombre) },
        Cliente: { rich_text: richText(input.cliente || input.nombre || '') },
        Expediente: { rich_text: richText(input.expediente || '') },
        'Tipo de plazo': { select: { name: input.tipo || 'Otro' } },
        'Evento que inicia plazo': { rich_text: richText(input.evento || '') },
        'Fecha de inicio': { date: { start: input.inicio } },
        'Días hábiles': { number: Number(input.dias) || 0 },
        Vencimiento: { date: { start: input.vencimiento } },
        Estado: { select: { name: input.estado || 'Pendiente' } },
        Origen: { select: { name: input.origen || 'Calendario inteligente' } },
        Observaciones: { rich_text: richText(input.observaciones || '') },
      },
    }),
  });
  return toClientPage(data);
}

async function deletePlazo(id) {
  await notionFetch(`/pages/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ archived: true }),
  });
}

export default async function handler(req, res) {
  try {
    requireConfig();
    if (req.method === 'GET') {
      return res.status(200).json(await listPlazos());
    }
    if (req.method === 'POST') {
      return res.status(201).json(await createPlazo(req.body || {}));
    }
    if (req.method === 'DELETE') {
      if (!req.query.id) return res.status(400).json({ error: 'Falta id.' });
      await deletePlazo(req.query.id);
      return res.status(204).end();
    }
    res.setHeader('Allow', 'GET, POST, DELETE');
    return res.status(405).json({ error: 'Método no permitido.' });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
