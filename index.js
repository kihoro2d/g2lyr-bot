import 'dotenv/config'

import { Bot, InlineKeyboard } from 'grammy'
import { Client as GeniusClient } from 'genius-lyrics'

const bot = new Bot(process.env.BOT_TOKEN)
const client = new GeniusClient(process.env.GENIUSKEY)

bot.on('inline_query', async (ctx) => {
  const query = ctx.inlineQuery.query
  const songs = await client.songs.search(query)

  const results = songs.map((song) => {
    const action = JSON.stringify({
      type: 'lyrics',
      data: song.id
    })

    return {
      type: 'article',

      id: song.id,
      url: song.url,
      title: song.title,
      description: song.artist.name,
      thumb_url: song.thumbnail,

      input_message_content: {
        parse_mode: 'HTML',
        message_text: `<b>${song.fullTitle}</b>`
      },

      reply_markup: new InlineKeyboard()
        .text('Lyrics', action)
        .url('Go to Genius', song.url)
    }
  })

  return ctx.answerInlineQuery(results)
})

bot.on('callback_query:data', async (ctx) => {
  const action = JSON.parse(ctx.callbackQuery.data)

  if (action.type === 'lyrics') {
    const id = parseInt(action.data)

    const song = await client.songs.get(id)
    const lyrics = await song.lyrics(true)

    const update = `<b>${song.fullTitle}</b>\n\n<i>${lyrics}</i>`

    await ctx.editMessageText(update, {
      parse_mode: 'HTML',
      reply_markup: new InlineKeyboard()
        .url('Go to Genius', song.url)
    })
  }

  await ctx.answerCallbackQuery('Done!')
})

bot.catch((err) => {
  const ctx = err.ctx
  console.error(`Error while handling update ${ctx.update.update_id}:`, err.error)
})

process.once('SIGINT', () => bot.stop())
process.once('SIGTERM', () => bot.stop())

bot.start({ drop_pending_updates: true })
