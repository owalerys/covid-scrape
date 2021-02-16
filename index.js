require('dotenv').config()

const puppeteer = require('puppeteer-extra')
const StealthPlugin = require('puppeteer-extra-plugin-stealth')

const db = require('./db')
const data = db.data

const { Telegraf } = require('telegraf')
const bot = new Telegraf(process.env.TELEGRAM_API_KEY)

puppeteer.use(StealthPlugin())

console.log(new Date().toISOString())
;(async () => {
  const browser = await puppeteer.launch({ headless: true })

  const page = await browser.newPage()

  await page.goto(
    'https://www.eventbrite.com/o/florida-department-of-health-in-collier-county-32165407705',
  )

  await page.waitForTimeout(1000)

  // EXTRACT
  const eventCards = await page.$$('div.eds-event-card--consumer')

  const getProps = async (card) => {
    const actionLinkEl = await card.$('a.eds-event-card-content__action-link')
    const actionLink = await actionLinkEl.getProperty('href')
    const actualURL = await actionLink.jsonValue()

    const dateLinkEl = await card.$(
      'div.eds-event-card-content__content-container div.eds-event-card-content__content div.eds-event-card-content__primary-content div.eds-text-color--primary-brand',
    )
    const dateHandle = await dateLinkEl.getProperty('innerHTML')
    const dateString = await dateHandle.jsonValue()

    return {
      actualURL,
      dateString,
    }
  }

  // TRANSFORM
  const events = await Promise.all(eventCards.map(getProps))

  // LOAD
  for (let i = 0; i < events.length; i++) {
    const event = events[i]

    if (data.events.indexOf(event.actualURL) !== -1) continue

    data.events.push(event.actualURL)

    const announcement = `Date: ${event.dateString}\nURL: ${event.actualURL}`

    console.log(announcement)
    bot.telegram.sendMessage(process.env.TELEGRAM_CONVERSATION_ID, announcement)
  }

  await page.close()

  await browser.close()

  db.save()
})()
