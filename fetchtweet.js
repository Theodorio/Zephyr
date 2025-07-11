const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const COOKIES_PATH = path.join(__dirname, 'twitter_cookies.json');

async function saveCookies(page) {
  const cookies = await page.cookies();
  fs.writeFileSync(COOKIES_PATH, JSON.stringify(cookies, null, 2));
}

async function loadCookies(page) {
  if (fs.existsSync(COOKIES_PATH)) {
    const cookies = JSON.parse(fs.readFileSync(COOKIES_PATH));
    await page.setCookie(...cookies);
    return true;
  }
  return false;
}

async function loginToTwitter(page) {
  await page.goto('https://twitter.com/login', { waitUntil: 'networkidle2' });

  await page.waitForSelector('input[name="text"]', { timeout: 15000 });
  await page.type('input[name="text"]', process.env.TWITTER_USER);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(2000);

  // Wait for password field
  await page.waitForSelector('input[name="password"]', { timeout: 15000 });
  await page.type('input[name="password"]', process.env.TWITTER_PASS);
  await page.keyboard.press('Enter');

  // Wait for homepage
  await page.waitForNavigation({ waitUntil: 'networkidle2' });
  await saveCookies(page);
}

async function fetchLatestTweet(username) {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  const cookiesLoaded = await loadCookies(page);

  if (!cookiesLoaded) {
    console.log('Logging into Twitter...');
    await loginToTwitter(page);
  }

  const profileUrl = `https://twitter.com/${username}`;
  await page.goto(profileUrl, { waitUntil: 'networkidle2' });

  try {
    await page.waitForSelector('article', { timeout: 15000 });

    const tweet = await page.evaluate(() => {
      const article = document.querySelector('article');
      const tweetText = article?.innerText || 'No tweet text found';

      const linkElem = article.querySelector('a[href*="/status/"]');
      const tweetUrl = linkElem ? `https://x.com${linkElem.getAttribute('href')}` : null;
      const tweetId = tweetUrl ? tweetUrl.split('/').pop() : null;

      const images = Array.from(article.querySelectorAll('img'))
        .map(img => img.src)
        .filter(src => src.includes('twimg') && !src.includes('profile_images'));

      const mediaUrl = images.length > 0 ? images[0] : null;

      return {
        tweetText,
        tweetId,
        tweetUrl,
        mediaUrl
      };
    });

    await browser.close();
    return tweet;
  } catch (err) {
    await browser.close();
    console.error(`Error scraping ${username}:`, err.message);
    throw new Error('Tweet scrape failed');
  }
}

module.exports = { fetchLatestTweet };
