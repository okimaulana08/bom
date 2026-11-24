/**
 * Batch Card Art & Arena Backdrop Generator for Aetherbound: Rift Duel
 * -------------------------------------------------------------------
 * Generates all 41 remaining bespoke card illustrations + 2 full-screen
 * Arena/Lobby backgrounds matching the dark-fantasy anime-cyberpunk style
 * of Aether Sovereign & Frostfire Chimera.
 *
 * Usage:
 *   GEMINI_API_KEY=your_key node scripts/generate-card-art.mjs
 *   (or) OPENAI_API_KEY=your_key node scripts/generate-card-art.mjs
 *
 * Output goes directly to public/assets/cards/<id>.jpg & public/assets/arenas/<id>.jpg.
 */

import fs from 'node:fs';
import path from 'node:path';

const STYLE_PREFIX =
  'High-resolution stylized dark-fantasy anime-cyberpunk TCG card illustration, crisp cel-shaded digital painting, dramatic rim lighting, dynamic full-bleed composition, no text, no borders, no frames, no watermarks: ';

const JOBS = [
  // Arenas / Backdrops
  {
    out: 'public/assets/arenas/lobby_sanctum.jpg',
    prompt:
      'Epic wide-angle cosmic rift coliseum sanctum at night, floating obsidian monoliths, glowing golden-cyan rotating astral magic circle on dark polished stone floor, floating embers and violet nebula sky, anime dark-fantasy game lobby background, no characters, no text',
  },
  {
    out: 'public/assets/arenas/duel_playmat.jpg',
    prompt:
      'Top-down slightly angled trading card game duel arena battlefield mat, dark obsidian stone engraved with glowing cyan and crimson energy conduits meeting at a glowing holographic astrolabe rift circle in center, symmetrical futuristic fantasy arena, no text',
  },
  // Remaining 41 Cards
  { out: 'public/assets/cards/pyro_hatchling.jpg', prompt: 'Pyroclast Hatchling, fierce baby obsidian-scaled volcanic dragon with glowing molten ember wings taking flight over volcanic glass shards' },
  { out: 'public/assets/cards/pyro_cinder_acolyte.jpg', prompt: 'Cinder Acolyte, hooded anime pyromancer duelist in dark volcanic robes conjuring twin blazing plasma fire orbs around a basalt staff' },
  { out: 'public/assets/cards/pyro_magma_lancer.jpg', prompt: 'Magma Lancer, agile crimson-armored anime dragoon knight leaping forward with a supercritical molten-lava plasma spear leaving fire trails' },
  { out: 'public/assets/cards/pyro_slag_golem.jpg', prompt: 'Obsidian Bruiser, colossal volcanic slag golem with glowing lava-cracked fists smashing an obsidian arena floor' },
  { out: 'public/assets/cards/pyro_ember_bolt.jpg', prompt: 'Ember Lance, blinding white-hot condensed riftfire javelin tearing diagonally through dark smoke with explosive sparks' },
  { out: 'public/assets/cards/pyro_caldera_domain.jpg', prompt: 'Obsidian Caldera, sweeping volcanic rift crater glowing with magma rivers and floating molten rune pillars under a crimson sky' },
  { out: 'public/assets/cards/pyro_magma_edge.jpg', prompt: 'Searing Fangblade, ornate dark-obsidian cyber-fantasy greatsword forged from a dragon fang with a glowing molten edge' },
  { out: 'public/assets/cards/pyro_cinder_burst.jpg', prompt: 'Blazing Ambush, hidden crimson volcanic glyph mine erupting beneath obsidian tiles in a dramatic shockwave of fire' },
  { out: 'public/assets/cards/cryo_frost_drone.jpg', prompt: 'Frost-Bit Drone, sleek silver-and-cyan hexagonal cybernetic reconnaissance drone venting subzero mist and glowing ice-blue optics' },
  { out: 'public/assets/cards/cryo_aegis_walker.jpg', prompt: 'Aegis Strider MK-II, heavy white-and-cyan bipedal cryo-mecha deploying a glowing hexagonal frost energy tower shield' },
  { out: 'public/assets/cards/cryo_rail_sniper.jpg', prompt: 'Subzero Railgunner, sleek anime cybernetic sniper aiming a glowing liquid-nitrogen electromagnetic railgun with icy muzzle flash' },
  { out: 'public/assets/cards/cryo_glacier_mech.jpg', prompt: 'Glacier Juggernaut, towering permafrost dreadnought mecha with giant translucent ice-crystal pauldrons venting a blizzard' },
  { out: 'public/assets/cards/cryo_valkyrie_zero.jpg', prompt: 'Valkyrie Zero-Nine, radiant white-and-silver cybernetic ice angel floating with six crystal energy wings and cryo-plasma halberd' },
  { out: 'public/assets/cards/cryo_absolute_lock.jpg', prompt: 'Cryo Stasis Field, holographic hexagonal snowflake energy cage flash-freezing space in diamond frost crystals' },
  { out: 'public/assets/cards/cryo_aegis_plate.jpg', prompt: 'Titanium Frostplate, ornate futuristic white-titanium and glowing cyan diamond-lattice chest armor relic emitting a ward halo' },
  { out: 'public/assets/cards/cryo_mirror_wall.jpg', prompt: 'Glacial Firewall, massive crystalline cyber-ice barrier deflecting incoming crimson sparks in dramatic refraction' },
  { out: 'public/assets/cards/umbra_wisp.jpg', prompt: 'Voidling Stalker, sleek spectral violet shadow-serpent wisp with glowing magenta eyes darting out of an abyssal rift' },
  { out: 'public/assets/cards/umbra_shade_blade.jpg', prompt: 'Nightveil Assassin, masked dark-violet anime shadow ninja lunging through neon amethyst mist with twin glowing void daggers' },
  { out: 'public/assets/cards/umbra_soul_reaper.jpg', prompt: 'Dusk Harvester, floating hooded cyber-gothic spectral reaper wielding a massive glowing amethyst crescent energy scythe' },
  { out: 'public/assets/cards/umbra_dread_knight.jpg', prompt: 'Netherblade Wraith, horned obsidian-armored phantom knight radiating a protective violet ward sphere and dark magenta sword' },
  { out: 'public/assets/cards/umbra_nyx_avatar.jpg', prompt: 'Nyx Void Empress, regal dark-fantasy anime empress seated on floating obsidian shards surrounded by orbiting magenta void blades' },
  { out: 'public/assets/cards/umbra_void_revival.jpg', prompt: 'Rite of the Abyss, dramatic vertical purple-and-magenta beam of void energy pulling a glowing spectral warrior up from a dark rune circle' },
  { out: 'public/assets/cards/umbra_cursed_scythe.jpg', prompt: 'Bloodmoon Scythe, crimson-and-violet crescent energy scythe floating in front of a dark lunar eclipse' },
  { out: 'public/assets/cards/umbra_shadow_snare.jpg', prompt: 'Shadow Snare, monstrous glowing violet shadow jaws and holographic chains erupting from the floor to ensnare a target' },
  { out: 'public/assets/cards/umbra_void_counter.jpg', prompt: 'Nullify Rift, swirling dark purple dimensional vortex shattering an enemy glowing cyan spell circle into fragments' },
  { out: 'public/assets/cards/sylvan_spirit_fox.jpg', prompt: 'Grove Spirit Fox, luminous emerald-and-white anime spirit fox with twin radiant golden-pollen tails in a bioluminescent night forest' },
  { out: 'public/assets/cards/sylvan_briar_warden.jpg', prompt: 'Briarbark Treant, towering ancient armored forest guardian treant with emerald rune-bark and glowing golden heartwood core' },
  { out: 'public/assets/cards/sylvan_tempest_griffin.jpg', prompt: 'Tempest Griffin, majestic emerald-and-gold armored sky griffin diving out of luminous stormclouds with glowing talons' },
  { out: 'public/assets/cards/sylvan_bloom_druid.jpg', prompt: 'Aetherbloom Mystic, young emerald-cloaked anime druidess channeling a glowing crystalline golden-green lotus over leyline roots' },
  { out: 'public/assets/cards/sylvan_gaia_stag.jpg', prompt: 'Verdant Crown Stag, colossal emerald-and-white celestial spirit stag with towering golden crystal antlers holding floating sun orbs' },
  { out: 'public/assets/cards/sylvan_aether_bloom.jpg', prompt: 'Rift Blossom, giant radiant crystalline emerald-and-gold lotus flower blooming out of cracked obsidian stone with glowing spores' },
  { out: 'public/assets/cards/sylvan_sanctuary.jpg', prompt: 'Emerald Sanctuary, serene bioluminescent ancient tree temple dome woven with golden-green glowing vines under starlight' },
  { out: 'public/assets/cards/sylvan_thorn_trap.jpg', prompt: 'Evolution Snare, glowing razor emerald briar vines bursting upward in a spiral trap laced with golden sparks' },
  { out: 'public/assets/cards/chrono_star_initiate.jpg', prompt: 'Astral Chronomancer, anime starlight mage reading a floating holographic silver constellation grimoire beside a golden clock ring' },
  { out: 'public/assets/cards/chrono_clock_angel.jpg', prompt: 'Clockwork Valkyrie, graceful celestial cyber-angel with gilded astrolabe wings and spinning indigo starlight gears' },
  { out: 'public/assets/cards/chrono_rift_weaver.jpg', prompt: 'Riftline Archmage, indigo-robed cosmic sorcerer pulling two glowing starlight dimensional portals together with outstretched hands' },
  { out: 'public/assets/cards/chrono_polymerization.jpg', prompt: 'Rift Polymerization, iconic twin spiraling vortices of glowing cyan and magenta energy colliding into a dazzling white singularity' },
  { out: 'public/assets/cards/chrono_convergence.jpg', prompt: 'Aether Convergence, five glowing elemental star-beams converging through golden astrolabe rings in deep indigo space' },
  { out: 'public/assets/cards/chrono_time_slip.jpg', prompt: 'Temporal Displacement, crystalline cosmic hourglass shattering into glowing blue clock hands and rewinding starlight ribbons' },
  { out: 'public/assets/cards/chrono_starlight_nexus.jpg', prompt: 'Astral Observatory, towering futuristic indigo spire floating in orbit surrounded by glowing rings and constellation beams' },
  { out: 'public/assets/cards/fusion_wildfire_behemoth.jpg', prompt: 'Wildfire Behemoth, colossal dual-faction Sylvan and Pyroclast beast of charred ancient wood, roaring magma core, and blazing emerald-gold antlers' },
];

const geminiKey = process.env.GEMINI_API_KEY;
const openaiKey = process.env.OPENAI_API_KEY;

if (!geminiKey && !openaiKey) {
  console.error(
    'Please set GEMINI_API_KEY or OPENAI_API_KEY before running.\nExample:\n  $env:GEMINI_API_KEY="..."; node scripts/generate-card-art.mjs'
  );
  process.exit(1);
}

async function generateWithGemini(fullPrompt, isArena = false) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${geminiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: fullPrompt }] }],
        generationConfig: {
          responseModalities: ['IMAGE'],
          imageConfig: { aspectRatio: isArena ? '16:9' : '3:4' },
        },
      }),
    }
  );
  if (!res.ok) throw new Error(`Gemini error ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const part = data.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data);
  if (!part?.inlineData?.data) throw new Error('No image bytes returned from Gemini.');
  return Buffer.from(part.inlineData.data, 'base64');
}

async function generateWithOpenAI(fullPrompt) {
  const res = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${openaiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-image-1',
      prompt: fullPrompt,
      size: '1024x1024',
      output_format: 'jpeg',
    }),
  });
  if (!res.ok) throw new Error(`OpenAI error ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const b64 = data.data?.[0]?.b64_json;
  if (!b64) throw new Error('No image bytes returned from OpenAI.');
  return Buffer.from(b64, 'base64');
}

async function main() {
  for (const job of JOBS) {
    const dest = path.resolve(job.out);
    if (fs.existsSync(dest)) {
      console.log(`SKIP (exists): ${job.out}`);
      continue;
    }
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    console.log(`Generating ${job.out}...`);
    const isArena = job.out.includes('/arenas/');
    const buf = geminiKey
      ? await generateWithGemini(STYLE_PREFIX + job.prompt, isArena)
      : await generateWithOpenAI(STYLE_PREFIX + job.prompt);
    fs.writeFileSync(dest, buf);
    console.log(`  Saved ${job.out} (${Math.round(buf.length / 1024)} KB)`);
  }
  console.log('\nDone! Update BESPOKE_CARD_ART in src/data/cardArtStyle.ts to point all generated cards to their new .jpg files.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
