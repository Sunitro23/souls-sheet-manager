export const weaponIcons = [
  { id: 'sword', name: 'Épée' },
  { id: 'dagger', name: 'Dague' },
  { id: 'greatsword', name: 'Espadon' },
  { id: 'axe', name: 'Hache' },
  { id: 'hammer', name: 'Marteau' },
  { id: 'spear', name: 'Lance' },
  { id: 'halberd', name: 'Hallebarde' },
  { id: 'scythe', name: 'Faux' },
  { id: 'bow', name: 'Arc' },
  { id: 'crossbow', name: 'Arbalète' },
  { id: 'whip', name: 'Fouet' },
  { id: 'claws', name: 'Griffes' },
  { id: 'staff', name: 'Bâton' },
  { id: 'seal', name: 'Sceau' },
  { id: 'chime', name: 'Cloche' },
];

export const maxWeaponIconLength = 32768;
export const maxWeaponIconFileSize = 5 * 1024 * 1024;

export function isUploadedWeaponIcon(value: unknown): value is string {
  if (typeof value !== 'string' || value.length > maxWeaponIconLength) return false;
  const match = /^data:image\/(?:png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(value);
  return !!match && match[1].length % 4 === 0;
}

export async function prepareWeaponIcon(file: File): Promise<string> {
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type))
    throw Error('Choisissez un fichier PNG, WebP ou JPG. Les SVG et GIF ne sont pas acceptés.');
  if (file.size > maxWeaponIconFileSize)
    throw Error('Cette image dépasse 5 Mo. Exportez une version plus petite avant de l’importer.');
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    try { await img.decode(); } catch {
      throw Error('Image illisible. Exportez-la à nouveau en PNG, WebP ou JPG.');
    }
    if (!img.naturalWidth || !img.naturalHeight)
      throw Error('Cette image n’a pas de dimensions valides.');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) throw Error('Impossible de préparer cette icône. Réessayez dans un autre navigateur.');
    for (const size of [256, 128]) {
      canvas.width = canvas.height = size;
      const scale = size / Math.max(img.naturalWidth, img.naturalHeight);
      const width = img.naturalWidth * scale, height = img.naturalHeight * scale;
      ctx.drawImage(img, (size - width) / 2, (size - height) / 2, width, height);
      for (const quality of [.9, .8, .65, .5]) {
        const data = canvas.toDataURL('image/webp', quality);
        if (isUploadedWeaponIcon(data)) return data;
      }
    }
    throw Error('Cette image reste trop volumineuse. Essayez une icône plus simple, avec moins de détails.');
  } finally {
    URL.revokeObjectURL(url);
  }
}

const defaults: Record<string, string> = {
  Sceaux: 'seal', Bâtons: 'staff', Dagues: 'dagger', 'Arcs courts': 'bow',
  Arcs: 'bow', Greatbows: 'bow', 'Épées courtes': 'sword', Épées: 'sword',
  'Épée longue': 'sword', Greatswords: 'greatsword', 'Colossal Weapons': 'greatsword',
  Haches: 'axe', Greataxes: 'axe', Marteaux: 'hammer', 'Great Hammers': 'hammer',
  Fléaux: 'hammer', Lances: 'spear', 'Great Spears': 'spear', Arbalètes: 'crossbow',
  Ballistes: 'crossbow', Hallebardes: 'halberd', Faux: 'scythe', Fouets: 'whip',
  Griffes: 'claws', 'Great Staves': 'staff',
};

export function weaponIconSource(category: string, icon?: string) {
  if (isUploadedWeaponIcon(icon)) return icon;
  const id = weaponIcons.some((choice) => choice.id === icon)
    ? icon
    : defaults[category] ?? 'sword';
  return `/ui/dark-souls/equipment/${id}.png`;
}
