/*
error fix sendiri jiR
api spotify nya kadang error, ganti aja punyamu gw males benerin scrape nya
*/
const { Telegraf, Markup, InputFile } = require("telegraf");
const axios = require("axios");
const set = require('./sett');

const bot = new Telegraf(set.token);

const spotifyCache = {}; 
const ytCache = {};

// -- ( Typing ) --
bot.use(async (ctx, next) => {
  if (ctx.message && ctx.message.text && ctx.message.text.startsWith('/')) {
    await ctx.sendChatAction('typing');
  }
  await next();
});

bot.start((ctx) => {
    const ya = `👋 Halo ${ctx.from.first_name}

Aku bot untuk mencari musik, di buat oleh @kriszzyy

All - Menu:

// -- ( Search ) --
/spotify [judul lagu]
/youtube [judul video]
/xneko

// -- { Stalker ) --
/stalktiktok [username]
/stalkig [username]
——————————————————————`
  ctx.reply(ya,
    { parse_mode: "HTML" }
  );
});

bot.command("xneko", async (ctx) => {
  try {
    const res = await axios.get(`${set.api}/random/xneko`, {
      responseType: "arraybuffer",
    });

    await ctx.replyWithPhoto(
      { source: Buffer.from(res.data) },
      {
        caption: "Sange berat😹😱🤪😏",
        reply_markup: {
          inline_keyboard: [[{ text: "➡️ ", callback_data: "foto_next" }]],
        },
      }
    );
  } catch (err) {
    console.error(err);
    ctx.reply(err);
  }
});

bot.command("spotify", async (ctx) => {
  try {
    const query = ctx.message.text.split(" ").slice(1).join(" ");
    if (!query) return ctx.reply(`❌ Enter the song title!\nExample: /spotify duka last child`);

    await ctx.reply("Searching for songs on Spotify...");

    const res = await axios.get(`${set.api}/search/spotif?q=${encodeURIComponent(query)}`);
    const data = res.data;

    if (!data.status || !data.result || !data.result.length)
      return ctx.reply("⚠️ not found!");

    spotifyCache[ctx.from.id] = {
      results: data.result,
      current: 0
    };

    const song = data.result[0];
    const caption = `🎵 *${song.title}*\n📀 Album: ${song.album}\n🕒 Durasi: ${song.duration}\n🔥 Popularitas: ${song.popularity}`;

    await ctx.replyWithPhoto(
      { url: song.image },
      {
        caption,
        parse_mode: "Markdown",
        reply_to_message_id: ctx.message.message_id,
        reply_markup: {
          inline_keyboard: [
            [
              { text: "⬅️", callback_data: "spotifyprev" },
              { text: "🎧 Music", callback_data: `spotifydl_0` },
              { text: "➡️", callback_data: "spotifynext" }
            ],
            [
              { text: "Dengarkan Di Spotify", url: song.url }
            ]
          ]
        }
      }
    );
  } catch (e) {
    console.error(e);
    ctx.reply(e);
  }
});

// -- ( Downloader Command ) --
bot.on("callback_query", async (ctx) => {
  try {
    const data = ctx.callbackQuery.data;
    const userId = ctx.from.id;
    const sData = spotifyCache[userId];
    const yData = ytCache[userId];

    if (!data) return ctx.answerCbQuery("Data tidak valid!");

    if (data.startsWith("spotify") && !sData) {
      return ctx.answerCbQuery("Kemu Belum Mencari Lagu!");
    }

    if (data === "spotifynext") {
      sData.current++;
      if (sData.current >= sData.results.length) sData.current = 0;

      const song = sData.results[sData.current];
      const caption = `🎵 *${song.title}*\n📀 Album: ${song.album}\n🕒 Durasi: ${song.duration}\n🔥 Popularitas: ${song.popularity}`;

      await ctx.editMessageMedia(
        {
          type: "photo",
          media: song.image,
          caption,
          parse_mode: "Markdown",
        },
        {
          reply_markup: {
            inline_keyboard: [
              [
                { text: "⬅️", callback_data: "spotifyprev" },
                { text: "🎧 Music", callback_data: `spotifydl_${sData.current}` },
                { text: "➡️", callback_data: "spotifynext" },
              ],
              [{ text: "Dengarkan Di Spotify", url: `${song.url}` }],
            ],
          },
        }
      );

      return ctx.answerCbQuery("Mencari data...");
    }

    if (data === "spotifyprev") {
      sData.current--;
      if (sData.current < 0) sData.current = sData.results.length - 1;

      const song = sData.results[sData.current];
      const caption = `🎵 *${song.title}*\n📀 Album: ${song.album}\n🕒 Durasi: ${song.duration}\n🔥 Popularitas: ${song.popularity}`;

      await ctx.editMessageMedia(
        {
          type: "photo",
          media: song.image,
          caption,
          parse_mode: "Markdown",
        },
        {
          reply_markup: {
            inline_keyboard: [
              [
                { text: "⬅️", callback_data: "spotifyprev" },
                { text: "🎧 Music", callback_data: `spotifydl_${sData.current}` },
                { text: "➡️", callback_data: "spotifynext" },
              ],
              [{ text: "Dengarkan Di Spotify", url: `${song.url}` }],
            ],
          },
        }
      );

      return ctx.answerCbQuery("Data sebelumnya...");
    }

    if (data.startsWith("spotifydl_")) {
      if (!sData) return ctx.answerCbQuery("Kemu Belum Mencari Lagu!");
      const index = parseInt(data.split("_")[1]);
      const song = sData.results[index];
      if (!song) return ctx.answerCbQuery("⚠️ Lagu tidak ditemukan di cache!");

      await ctx.answerCbQuery("Mulai Mengunduh...");
      await ctx.editMessageReplyMarkup({ inline_keyboard: [] });

      const res = await axios.get(`${set.api}/downloader/spotif?url=${encodeURIComponent(song.url)}`);
      const dl = res.data.result;

      await ctx.replyWithAudio({ url: dl.download }, { caption: `${dl.title}` });
    }

    if (data.startsWith("yta_")) {
      if (!yData) return ctx.answerCbQuery("Kemu Belum Mencari Lagu!");
      const url = decodeURIComponent(data.replace("yta_", ""));
      await ctx.answerCbQuery("Mengunduh Audio...");
      await ctx.editMessageReplyMarkup();

      const res = await axios.get(`${set.api}/downloader/yta?url=${encodeURIComponent(url)}`);
      const yt = res.data;

      await ctx.replyWithAudio({ url: yt.download_url }, { caption: `${yt.title}` });
    }

    if (data.startsWith("ytv_")) {
      if (!yData) return ctx.answerCbQuery("Kemu Belum Mencari Video!");
      const url = decodeURIComponent(data.replace("ytv_", ""));
      await ctx.answerCbQuery("🎬 Mengunduh video...");
      await ctx.editMessageReplyMarkup();

      const res = await axios.get(`${set.api}/downloader/ytv?url=${encodeURIComponent(url)}`);
      const yt = res.data;

      await ctx.replyWithVideo({ url: yt.download_url }, { caption: `${yt.title}` });
    }

    if (data === "foto_next") {
  try {
    await ctx.answerCbQuery("🔄 Mengambil foto baru...");

    const res = await axios.get(`${set.api}/random/xneko`, {
      responseType: "arraybuffer",
    });

    const buffer = Buffer.from(res.data);

    await ctx.editMessageMedia(
      {
        type: "photo",
        media: { source: buffer },
        caption: "Sange berat😹😱🤪😏",
        parse_mode: "Markdown",
      },
      {
        reply_markup: {
          inline_keyboard: [[{ text: "➡️ ", callback_data: "foto_next" }]],
        },
      }
    );
  } catch (err) {
    console.error(err);
    await ctx.reply(err);
  }
}

  } catch (err) {
    console.error("Callback Error:", err);
  }
});

// -- ( YouTube Search ) --
bot.command(["youtube", "yt"], async (ctx) => {
  try {
    const query = ctx.message.text.split(" ").slice(1).join(" ");
    if (!query) return ctx.reply("Masukkan kata kunci!\nContoh: /youtube duka last child");

    await ctx.reply("🔎 Mencari data di YouTube...");

    const res = await axios.get(`${set.api}/search/youtube?q=${encodeURIComponent(query)}`);
    const data = res.data;

    if (!data.status || !data.result.length) return ctx.reply("⚠️ Tidak ditemukan!");

    ytCache[ctx.from.id] = {
      results: data.result,
      current: 0
    };
      
    for (const vid of data.result.slice(0, 1)) { //1 itu kirim 1 hasil
      await ctx.replyWithPhoto(
        { url: vid.imageUrl },
        {
          caption: `🎬 *${vid.title}*\n📺 Channel: ${vid.channel}\n🕒 Durasi: ${vid.duration}`,
          parse_mode: "HTML",
          reply_to_message_id: ctx.message.message_id,
  ...Markup.inlineKeyboard([
    [
      Markup.button.callback('Audio Play', `yta_${encodeURIComponent(vid.link)}`),
      Markup.button.callback('Video Play', `ytv_${encodeURIComponent(vid.link)}`)
    ],
    [
      Markup.button.url('Tonton Di YouTube', `${vid.link}`)
    ]
  ])
});
    }
  } catch (e) {
    console.error(e);
    ctx.reply("❌ An error occurred while searching on YouTube!");
  }
});

bot.command("stalktiktok", async (ctx) => {
  try {
    const username = ctx.message.text.split(" ").slice(1).join(" ");
    if (!username) return ctx.reply("Enter your TikTok username!\nExample: /stalktiktok mrbeast");

    ctx.reply("🔎 Fetching TikTok data...");

    const res = await axios.get(`${set.api}/stalk/tiktok?q=${encodeURIComponent(username)}`);
    const tiktok = res.data;

    await ctx.replyWithPhoto(
      { url: tiktok.avatar },
      {
        caption: `🕵️ *TikTok Stalker*\n\n👤 Username: @${tiktok.username}\n📛 Nama: ${tiktok.nama}\n📄 Bio: ${tiktok.bio}\n✔️ Verifikasi: ${tiktok.verifikasi}\n👥 Followers: ${tiktok.totalfollowers}\n👣 Mengikuti: ${tiktok.totalmengikuti}\n❤️ Disukai: ${tiktok.totaldisukai}\n🎞️ Total Video: ${tiktok.totalvideo}`,
        parse_mode: "Markdown"
      }
    );
  } catch (e) {
    console.error(e);
    ctx.reply("Failed to fetch TikTok data!");
  }
});

bot.command("stalkig", async (ctx) => {
  try {
    const username = ctx.message.text.split(" ").slice(1).join(" ");
    if (!username) return ctx.reply("Enter your Instagram username!\nExample: /stalkig mrbeast");

    ctx.reply("🔎 Retrieving Instagram data...");

    const res = await axios.get(`${set.api}/stalk/instagram?q=${encodeURIComponent(username)}`);
    const ig = res.data.result;

      const ya = `📸 *Instagram Stalker*
      
      👤 Username: @${ig.username}
      📛 Nama: ${ig.full_name}
      📄 Bio: ${ig.biography}
      ✔️ Verifikasi: ${ig.is_verified}
      🔒 Private: ${ig.is_private}
      👥 Followers: ${ig.statistics.follower}
      👣 Mengikuti: ${ig.statistics.following}
      📸 Postingan: ${ig.statistics.post}`
      
    await ctx.replyWithPhoto(
      { url: ig.profile_pic_hd.url },
      {
        caption: ya,
        parse_mode: "Markdown"
      }
    );
      /*
      ada canvas nya cuman lagi error mls benerin
      */
  } catch (e) {
    console.error(e);
    ctx.reply("Failed to fetch Instagram data!");
  }
});

// -- ( Jalankan Bot ) --
bot.launch();
console.clear();
console.log("Pov mk momen ketiak");

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
