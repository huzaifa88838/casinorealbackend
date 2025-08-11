/**
 * Markets API Routes
 * Handles all market-related API endpoints
 */

const { v4: uuidv4 } = require('uuid');
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const config = require('../config');
const axios = require('axios'); // Yeh neeche likha hua hai

// Mock data for popular markets (fallback)
const mockPopularMarkets = [
  {
    id: '1.123456789',
    name: 'Manchester United v Arsenal',
    sport: 'Soccer',
    country: 'United Kingdom',
    competition: 'Premier League',
    marketStartTime: '2025-07-05T15:00:00.000Z',
    total_matched: 2500000.75
  },
  {
    id: '1.123456790',
    name: 'Liverpool v Chelsea',
    sport: 'Soccer',
    country: 'United Kingdom',
    competition: 'Premier League',
    marketStartTime: '2025-07-06T16:30:00.000Z',
    total_matched: 1800000.50
  },
  {
    id: '1.123456791',
    name: 'Real Madrid v Barcelona',
    sport: 'Soccer',
    country: 'Spain',
    competition: 'La Liga',
    marketStartTime: '2025-07-05T19:00:00.000Z',
    total_matched: 3200000.25
  },
  {
    id: '1.123456792',
    name: 'Novak Djokovic v Rafael Nadal',
    sport: 'Tennis',
    country: 'United Kingdom',
    competition: 'Wimbledon',
    marketStartTime: '2025-07-07T13:00:00.000Z',
    total_matched: 1200000.00
  },
  {
    id: '1.123456793',
    name: 'Los Angeles Lakers v Boston Celtics',
    sport: 'Basketball',
    country: 'USA',
    competition: 'NBA',
    marketStartTime: '2025-07-08T00:00:00.000Z',
    total_matched: 950000.50
  }
];

/**
 * @route   GET /api/Markets/popular
 * @desc    Get popular markets across all sports
 * @access  Public
 */
router.get('/popular', async (req, res) => {
  try {
    console.log('Fetching popular markets...');
    
    // Try to get markets from database
    const db = mongoose.connection.db;
    
    // Check if markets collection exists
    const collections = await db.listCollections({ name: 'markets' }).toArray();
    if (collections.length > 0) {
      console.log('Markets collection found, fetching data...');
      
      // Get markets from database
      const markets = await db.collection('markets')
        .find({ is_popular: true })
        .limit(10)
        .toArray();
      
      if (markets && markets.length > 0) {
        console.log(`Found ${markets.length} popular markets in database`);
        
        // Return markets from database
        return res.json({
          status: 'success',
          data: markets.map(market => ({
            ...market,
            _id: undefined // Remove MongoDB ID
          }))
        });
      }
    }
    
    // If no markets in database, use mock data
    console.log('No markets found in database, using mock data');
    
    return res.json({
      status: 'success',
      data: mockPopularMarkets
    });
  } catch (error) {
    console.error('Error fetching popular markets:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to get popular markets',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/Markets/:marketId
 * @desc    Get specific market by ID
 * @access  Public
 */

// const APP_KEY = '8sCvSYczC1qAr27v'; // ✅ your actual Betfair App Key
// const USERNAME = 'latifsohu@hotmail.com'; // ✅ your Betfair username
// const PASSWORD = 'Bahria@2026'; // ✅ your Betfair password

const USERNAME = process.env.BETFAIR_USERNAME
const PASSWORD = process.env.BETFAIR_PASSWORD
const APP_KEY = process.env.BETFAIR_APP_KEY
// console.log('Username:', USERNAME);
// console.log('Password:', PASSWORD ? '******' : 'No Password');
// console.log('App Key:', APP_KEY);

// // 🔐 Get session token from Betfair login API


  

// 🚀 Fetch live
//  markets (auto-login)




// 🚀 Fetch live markets for multiple sports

async function getSessionToken() {
  try {
    const response = await axios.post(
      'https://identitysso.betfair.com/api/login',
      new URLSearchParams({
        username: USERNAME,
        password: PASSWORD
      }),
      {
        headers: {
          'X-Application': APP_KEY,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    const data = response.data;

    if (data.status === 'SUCCESS') {
      return data.token;
    } else {
      throw new Error(`Login failed: ${data.error}`);
    }
  } catch (err) {
    console.error('❌ Failed to login to Betfair:', err.message);
    throw err;
  }
}

// 🎯 Fetch live cricket markets only
router.get('/live/cricket', async (req, res) => {
  try {
    const sessionToken = await getSessionToken();

    // 🎯 Step 1: Get cricket events
    const eventsResponse = await axios.post(
      'https://api.betfair.com/exchange/betting/json-rpc/v1',
      [
        {
          jsonrpc: '2.0',
          method: 'SportsAPING/v1.0/listEvents',
          params: {
            filter: {
              eventTypeIds: ['4'],
              marketStartTime: {
                from: new Date().toISOString()
              }
            }
          },
          id: 1
        }
      ],
      {
        headers: {
          'X-Application': APP_KEY,
          'X-Authentication': sessionToken,
          'Content-Type': 'application/json'
        }
      }
    );

    const events = eventsResponse.data[0]?.result || [];
    const eventIds = events.map(e => e.event.id);

    // 🎯 Step 2: Get market catalogue
    const marketCatalogueResponse = await axios.post(
      'https://api.betfair.com/exchange/betting/json-rpc/v1',
      [
        {
          jsonrpc: '2.0',
          method: 'SportsAPING/v1.0/listMarketCatalogue',
          params: {
            filter: {
              eventIds: eventIds,
              marketTypeCodes: ['MATCH_ODDS']
            },
            maxResults: '10',
            marketProjection: ['EVENT', 'RUNNER_METADATA']
          },
          id: 2
        }
      ],
      {
        headers: {
          'X-Application': APP_KEY,
          'X-Authentication': sessionToken,
          'Content-Type': 'application/json'
        }
      }
    );

    const marketCatalogues = marketCatalogueResponse.data[0]?.result || [];
    const marketIds = marketCatalogues.map(m => m.marketId);

    // 🎯 Step 3: Get market books (odds + volume)
    const marketBookResponse = await axios.post(
      'https://api.betfair.com/exchange/betting/json-rpc/v1',
      [
        {
          jsonrpc: '2.0',
          method: 'SportsAPING/v1.0/listMarketBook',
          params: {
            marketIds: marketIds,
            priceProjection: {
              priceData: ['EX_BEST_OFFERS']
            }
          },
          id: 3
        }
      ],
      {
        headers: {
          'X-Application': APP_KEY,
          'X-Authentication': sessionToken,
          'Content-Type': 'application/json'
        }
      }
    );

    const marketBooks = marketBookResponse.data[0]?.result || [];

    // 🔄 Combine data
    // 🔄 Combine data
const finalData = marketCatalogues.map(market => {
  const matchingBook = marketBooks.find(b => b.marketId === market.marketId);
  const event = events.find(e => e.event.id === market.event.id);

  const selections = market.runners.map(runner => {
    const runnerBook = matchingBook?.runners.find(r => r.selectionId === runner.selectionId);
    return {
      name: runner.runnerName,
      back: runnerBook?.ex?.availableToBack?.[0] || { price: '-', size: '-' },
      lay: runnerBook?.ex?.availableToLay?.[0] || { price: '-', size: '-' }
    };
  });

  // 🧠 Assume:
  // selections[0] = team 1
  // selections[1] = X (draw) — only in soccer
  // selections[2] = team 2

  const odds = {
    back1: selections[0]?.back || { price: '-', size: '-' },
    lay1: selections[0]?.lay || { price: '-', size: '-' },
    backX: selections[1]?.back || { price: '-', size: '-' },
    layX: selections[1]?.lay || { price: '-', size: '-' },
    back2: selections[2]?.back || { price: '-', size: '-' },
    lay2: selections[2]?.lay || { price: '-', size: '-' }
  };

  return {
    marketId: market.marketId,
    match: event?.event.name || 'Unknown',
    startTime: event?.event.openDate || '',
    inPlay: matchingBook?.inPlay || false,
    totalMatched: matchingBook?.totalMatched || 0,
    odds
  };
});

    res.status(200).json({
      status: 'success',
      data: finalData
    });

  } catch (err) {
    console.error('❌ Betfair API Error:', err.message);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch live cricket odds',
      error: err.message
    });
  }
});

router.get('/live/football', async (req, res) => {
  try {
    const sessionToken = "7cJ1B9qC2VOUGQHhzwxcDuNEP90ovsJmWBcRmJDRpuU=";

    // 🎯 Step 1: Get football events
    const eventsResponse = await axios.post(
      'https://api.betfair.com/exchange/betting/json-rpc/v1',
      [
        {
          jsonrpc: '2.0',
          method: 'SportsAPING/v1.0/listEvents',
          params: {
            filter: {
              eventTypeIds: ['1'], // ⚽ Football
              marketStartTime: {
                from: new Date().toISOString()
              }
            }
          },
          id: 1
        }
      ],
      {
        headers: {
          'X-Application': APP_KEY,
          'X-Authentication': sessionToken,
          'Content-Type': 'application/json'
        }
      }
    );

    const events = eventsResponse.data[0]?.result || [];
    const eventIds = events.map(e => e.event.id);

    // 🎯 Step 2: Get market catalogue
    const marketCatalogueResponse = await axios.post(
      'https://api.betfair.com/exchange/betting/json-rpc/v1',
      [
        {
          jsonrpc: '2.0',
          method: 'SportsAPING/v1.0/listMarketCatalogue',
          params: {
            filter: {
              eventIds: eventIds,
              marketTypeCodes: ['MATCH_ODDS']
            },
            maxResults: '10',
            marketProjection: ['EVENT', 'RUNNER_METADATA']
          },
          id: 2
        }
      ],
      {
        headers: {
          'X-Application': APP_KEY,
          'X-Authentication': sessionToken,
          'Content-Type': 'application/json'
        }
      }
    );

    const marketCatalogues = marketCatalogueResponse.data[0]?.result || [];
    const marketIds = marketCatalogues.map(m => m.marketId);

    // 🎯 Step 3: Get market books (odds + volume)
    const marketBookResponse = await axios.post(
      'https://api.betfair.com/exchange/betting/json-rpc/v1',
      [
        {
          jsonrpc: '2.0',
          method: 'SportsAPING/v1.0/listMarketBook',
          params: {
            marketIds: marketIds,
            priceProjection: {
              priceData: ['EX_BEST_OFFERS']
            }
          },
          id: 3
        }
      ],
      {
        headers: {
          'X-Application': APP_KEY,
          'X-Authentication': sessionToken,
          'Content-Type': 'application/json'
        }
      }
    );

    const marketBooks = marketBookResponse.data[0]?.result || [];

    // 🔄 Combine data like cricket
    const finalData = marketCatalogues.map(market => {
      const matchingBook = marketBooks.find(b => b.marketId === market.marketId);
      const event = events.find(e => e.event.id === market.event.id);

      const selections = market.runners.map(runner => {
        const runnerBook = matchingBook?.runners.find(r => r.selectionId === runner.selectionId);
        return {
          name: runner.runnerName,
          back: runnerBook?.ex?.availableToBack?.[0] || { price: '-', size: '-' },
          lay: runnerBook?.ex?.availableToLay?.[0] || { price: '-', size: '-' }
        };
      });

      // 🧠 Assume:
      // selections[0] = team 1
      // selections[1] = X (draw)
      // selections[2] = team 2

      const odds = {
        back1: selections[0]?.back || { price: '-', size: '-' },
        lay1: selections[0]?.lay || { price: '-', size: '-' },
        backX: selections[1]?.back || { price: '-', size: '-' },
        layX: selections[1]?.lay || { price: '-', size: '-' },
        back2: selections[2]?.back || { price: '-', size: '-' },
        lay2: selections[2]?.lay || { price: '-', size: '-' }
      };

      return {
        marketId: market.marketId,
        match: event?.event.name || 'Unknown',
        startTime: event?.event.openDate || '',
        inPlay: matchingBook?.inPlay || false,
        totalMatched: matchingBook?.totalMatched || 0,
        odds
      };
    });

    res.status(200).json({
      status: 'success',
      data: finalData
    });

  } catch (err) {
    console.error('❌ Betfair API Error:', err.message);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch live football odds',
      error: err.message
    });
  }
});
router.get('/live/sports/:id', async (req, res) => {
  try {
    const sessionToken = "7cJ1B9qC2VOUGQHhzwxcDuNEP90ovsJmWBcRmJDRpuU=";

    // If /live/sports/:id, get single marketId
    const singleMarketId = req.params.id;

    // Accept eventTypeIds and marketIds as query params (for /live/sports)
    let eventTypeIds = [];
    if (req.query.eventTypeIds) {
      eventTypeIds = req.query.eventTypeIds.split(',');
    }
    let filter = {
      marketStartTime: {
        from: new Date().toISOString()
      }
    };
    if (eventTypeIds.length > 0) filter.eventTypeIds = eventTypeIds;

    // 1. Get all sports events
    const eventsResponse = await axios.post(
      'https://api.betfair.com/exchange/betting/json-rpc/v1',
      [
        {
          jsonrpc: '2.0',
          method: 'SportsAPING/v1.0/listEvents',
          params: { filter },
          id: 1
        }
      ],
      {
        headers: {
          'X-Application': APP_KEY,
          'X-Authentication': sessionToken,
          'Content-Type': 'application/json'
        }
      }
    );

    const events = eventsResponse.data[0]?.result || [];
    const eventIds = events.map(e => e.event.id);

    if (!eventIds.length) {
      return res.status(200).json({
        status: 'success',
        data: []
      });
    }

    // 2. Get market catalogue (MATCH_ODDS) for these events
    const marketCatalogueResponse = await axios.post(
      'https://api.betfair.com/exchange/betting/json-rpc/v1',
      [
        {
          jsonrpc: '2.0',
          method: 'SportsAPING/v1.0/listMarketCatalogue',
          params: {
            filter: {
              eventIds: eventIds,
              marketTypeCodes: ['MATCH_ODDS']
            },
            maxResults: '100',
            marketProjection: ['EVENT', 'RUNNER_METADATA']
          },
          id: 2
        }
      ],
      {
        headers: {
          'X-Application': APP_KEY,
          'X-Authentication': sessionToken,
          'Content-Type': 'application/json'
        }
      }
    );

    let marketCatalogues = marketCatalogueResponse.data[0]?.result || [];
    let marketIds = marketCatalogues.map(m => m.marketId);

    // Filter by singleMarketId for /live/sports/:id
    if (singleMarketId) {
      marketCatalogues = marketCatalogues.filter(m => m.marketId === singleMarketId);
      marketIds = [singleMarketId];
    }
    // Or filter by marketIds query for /live/sports
    else if (req.query.marketIds) {
      const filterMarketIds = req.query.marketIds.split(',');
      marketCatalogues = marketCatalogues.filter(m => filterMarketIds.includes(m.marketId));
      marketIds = marketCatalogues.map(m => m.marketId);
    }

    if (!marketIds.length) {
      return res.status(200).json({
        status: 'success',
        data: []
      });
    }

    // 3. Get market books (odds + volume)
    const marketBookResponse = await axios.post(
      'https://api.betfair.com/exchange/betting/json-rpc/v1',
      [
        {
          jsonrpc: '2.0',
          method: 'SportsAPING/v1.0/listMarketBook',
          params: {
            marketIds: marketIds,
            priceProjection: {
              priceData: ['EX_BEST_OFFERS']
            }
          },
          id: 3
        }
      ],
      {
        headers: {
          'X-Application': APP_KEY,
          'X-Authentication': sessionToken,
          'Content-Type': 'application/json'
        }
      }
    );

    const marketBooks = marketBookResponse.data[0]?.result || [];

    // 4. Combine all data into desired format
    const finalData = marketCatalogues.map(market => {
      const matchingBook = marketBooks.find(b => b.marketId === market.marketId);
      const event = events.find(e => e.event.id === market.event.id);

      const selections = market.runners.map(runner => {
        const runnerBook = matchingBook?.runners.find(r => r.selectionId === runner.selectionId);
        return {
          name: runner.runnerName,
          back: runnerBook?.ex?.availableToBack?.[0] || { price: '-', size: '-' },
          lay: runnerBook?.ex?.availableToLay?.[0] || { price: '-', size: '-' }
        };
      });

      const odds = {
        back1: selections[0]?.back || { price: '-', size: '-' },
        lay1: selections[0]?.lay || { price: '-', size: '-' },
        backX: selections[1]?.back || { price: '-', size: '-' },
        layX: selections[1]?.lay || { price: '-', size: '-' },
        back2: selections[2]?.back || { price: '-', size: '-' },
        lay2: selections[2]?.lay || { price: '-', size: '-' }
      };

      return {
        marketId: market.marketId,
        match: event?.event.name || 'Unknown',
        startTime: event?.event.openDate || '',
        sportId: event?.event.eventTypeId || '',
        inPlay: matchingBook?.inPlay || false,
        totalMatched: matchingBook?.totalMatched || 0,
        odds,
        runners: market.runners,
        marketBook: matchingBook
      };
    });

    res.status(200).json({
      status: 'success',
      data: finalData
    });

  } catch (err) {
    console.error('❌ Betfair API Error:', err.message);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch live sports odds',
      error: err.message
    });
  }
});



router.get('/live/tennis', async (req, res) => {
  try {
    const sessionToken = "7cJ1B9qC2VOUGQHhzwxcDuNEP90ovsJmWBcRmJDRpuU=";

    // Step 1: Get tennis events
    const eventsResponse = await axios.post(
      'https://api.betfair.com/exchange/betting/json-rpc/v1',
      [
        {
          jsonrpc: '2.0',
          method: 'SportsAPING/v1.0/listEvents',
          params: {
            filter: {
              eventTypeIds: ['2'],
              marketStartTime: {
                from: new Date().toISOString()
              }
            }
          },
          id: 1
        }
      ],
      {
        headers: {
          'X-Application': APP_KEY,
          'X-Authentication': sessionToken,
          'Content-Type': 'application/json'
        }
      }
    );

    let events = eventsResponse.data[0]?.result || [];

    // Filter out unwanted names
    events = events.filter(item => {
      const name = item.event.name.toLowerCase();
      return !name.includes('set') && !name.includes('game') && !name.includes('odds');
    });

    const eventIds = events.map(e => e.event.id);

    // Step 2: Get market catalogue
    const marketCatalogueResponse = await axios.post(
      'https://api.betfair.com/exchange/betting/json-rpc/v1',
      [
        {
          jsonrpc: '2.0',
          method: 'SportsAPING/v1.0/listMarketCatalogue',
          params: {
            filter: {
              eventIds: eventIds,
              marketTypeCodes: ['MATCH_ODDS']
            },
            maxResults: '20',
            marketProjection: ['EVENT', 'RUNNER_METADATA']
          },
          id: 2
        }
      ],
      {
        headers: {
          'X-Application': APP_KEY,
          'X-Authentication': sessionToken,
          'Content-Type': 'application/json'
        }
      }
    );

    const marketCatalogues = marketCatalogueResponse.data[0]?.result || [];
    const marketIds = marketCatalogues.map(m => m.marketId);

    // Step 3: Get market books
    const marketBookResponse = await axios.post(
      'https://api.betfair.com/exchange/betting/json-rpc/v1',
      [
        {
          jsonrpc: '2.0',
          method: 'SportsAPING/v1.0/listMarketBook',
          params: {
            marketIds: marketIds,
            priceProjection: {
              priceData: ['EX_BEST_OFFERS']
            }
          },
          id: 3
        }
      ],
      {
        headers: {
          'X-Application': APP_KEY,
          'X-Authentication': sessionToken,
          'Content-Type': 'application/json'
        }
      }
    );

    const marketBooks = marketBookResponse.data[0]?.result || [];

    // Final Combine (same as cricket style)
    const finalData = marketCatalogues.map(market => {
      const matchingBook = marketBooks.find(b => b.marketId === market.marketId);
      const event = events.find(e => e.event.id === market.event.id);

      const selections = market.runners.map(runner => {
        const runnerBook = matchingBook?.runners.find(r => r.selectionId === runner.selectionId);
        return {
          name: runner.runnerName,
          back: runnerBook?.ex?.availableToBack?.[0] || { price: '-', size: '-' },
          lay: runnerBook?.ex?.availableToLay?.[0] || { price: '-', size: '-' }
        };
      });

      const odds = {
        back1: selections[0]?.back || { price: '-', size: '-' },
        lay1: selections[0]?.lay || { price: '-', size: '-' },
        back2: selections[1]?.back || { price: '-', size: '-' },
        lay2: selections[1]?.lay || { price: '-', size: '-' },
        backX: selections[1]?.back || { price: '-', size: '-' },
        layX: selections[1]?.lay || { price: '-', size: '-' }

      };

      return {
        marketId: market.marketId,
        match: event?.event.name || 'Unknown',
        startTime: event?.event.openDate || '',
        inPlay: matchingBook?.inPlay || false,
        totalMatched: matchingBook?.totalMatched || 0,
        odds
      };
    });

    res.status(200).json({
      status: 'success',
      data: finalData
    });

  } catch (err) {
    console.error('🎾 Tennis API Error:', err.message);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch tennis data',
      error: err.message
    });
  }
});



router.get('/live/horse', async (req, res) => {
  try {
    const sessionToken = "7cJ1B9qC2VOUGQHhzwxcDuNEP90ovsJmWBcRmJDRpuU=";

    // 🐎 Step 1: Get horse racing events
    const eventsResponse = await axios.post(
      'https://api.betfair.com/exchange/betting/json-rpc/v1',
      [
        {
          jsonrpc: '2.0',
          method: 'SportsAPING/v1.0/listEvents',
          params: {
            filter: {
              eventTypeIds: ['7'], // Horse Racing
              marketStartTime: {
                from: new Date().toISOString()
              },
              marketCountries: ['AU', 'GB'] // ✅ Only AU & GB

            }
          },
          id: 1
        }
      ],
      {
        headers: {
          'X-Application': APP_KEY,
          'X-Authentication': sessionToken,
          'Content-Type': 'application/json'
        }
      }
    );

    const events = eventsResponse.data[0]?.result || [];
    const eventIds = events.map(e => e.event.id);

    // 🐎 Step 2: Get market catalogue (WIN markets)
    const marketCatalogueResponse = await axios.post(
      'https://api.betfair.com/exchange/betting/json-rpc/v1',
      [
        {
          jsonrpc: '2.0',
          method: 'SportsAPING/v1.0/listMarketCatalogue',
          params: {
            filter: {
              eventIds: eventIds,
              marketTypeCodes: ['WIN']
            },
            maxResults: '10',
            marketProjection: ['EVENT', 'RUNNER_METADATA']
          },
          id: 2
        }
      ],
      {
        headers: {
          'X-Application': APP_KEY,
          'X-Authentication': sessionToken,
          'Content-Type': 'application/json'
        }
      }
    );

    const marketCatalogues = marketCatalogueResponse.data[0]?.result || [];
    const marketIds = marketCatalogues.map(m => m.marketId);

    // 🐎 Step 3: Get market books (odds + volume)
    const marketBookResponse = await axios.post(
      'https://api.betfair.com/exchange/betting/json-rpc/v1',
      [
        {
          jsonrpc: '2.0',
          method: 'SportsAPING/v1.0/listMarketBook',
          params: {
            marketIds: marketIds,
            priceProjection: {
              priceData: ['EX_BEST_OFFERS']
            }
          },
          id: 3
        }
      ],
      {
        headers: {
          'X-Application': APP_KEY,
          'X-Authentication': sessionToken,
          'Content-Type': 'application/json'
        }
      }
    );

    const marketBooks = marketBookResponse.data[0]?.result || [];

    // 🔄 Combine data
  // 🔄 Combine data
let finalData = marketCatalogues.map(market => {
  const matchingBook = marketBooks.find(b => b.marketId === market.marketId);
  const event = events.find(e => e.event.id === market.event.id);

  return {
    marketId: market.marketId, // <=== Yahan marketId add kiya
    match: event?.event.name,
    startTime: event?.event.openDate,
    totalMatched: matchingBook?.totalMatched,
    selections: market.runners.map(runner => {
      const runnerBook = matchingBook?.runners.find(r => r.selectionId === runner.selectionId);
      return {
        name: runner.runnerName,
        back: runnerBook?.ex?.availableToBack?.slice(0, 3).map(b => ({
          price: b.price,
          size: b.size
        })) || [],
        lay: runnerBook?.ex?.availableToLay?.slice(0, 3).map(l => ({
          price: l.price,
          size: l.size
        })) || []
      };
    })
  };
});

// 📅 Time wise sort (ascending)
finalData.sort((a, b) => new Date(a.startTime) - new Date(b.startTime));

res.status(200).json({
  status: 'success',
  data: finalData
});


  } catch (err) {
    console.error('❌ Horse Racing API Error:', err.message);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch horse racing odds',
      error: err.message
    });
  }
});


const sportMap = {
  1: { name: "Soccer", image: "soccer.svg" },
  2: { name: "Tennis", image: "tennis.svg" },
  3: { name: "Basketball", image: "basketball.svg" },
  4: { name: "Cricket", image: "cricket.svg" },
  5: { name: "American Football", image: "american_football.svg" },
  6: { name: "Baseball", image: "baseball.svg" },
  7: { name: "Golf", image: "golf.svg" },
  4339: { name: "Horse Racing", image: "horse.svg" },
  // Apne hisaab se aur bhi add kar sakte hain
};

router.get('/catalog2', async (req, res) => {
  try {
    const marketId = req.query.id;

    if (!marketId) {
      return res.status(400).json({ error: "marketId is required in query parameters" });
    }

    const token = "7cJ1B9qC2VOUGQHhzwxcDuNEP90ovsJmWBcRmJDRpuU=";

    const headers = {
      'X-Application': APP_KEY,
      'X-Authentication': token,
      'Content-Type': 'application/json'
    };

    // 🧠 1. Get Market Catalogue
    const catalogResponse = await axios.post(
      'https://api.betfair.com/exchange/betting/json-rpc/v1',
      [{
        jsonrpc: "2.0",
        method: "SportsAPING/v1.0/listMarketCatalogue",
        params: {
          filter: { marketIds: [marketId] },
          marketProjection: [
            "EVENT",
            "MARKET_START_TIME",
            "RUNNER_DESCRIPTION",
            "COMPETITION",
            "MARKET_DESCRIPTION",
            "EVENT_TYPE" // Ensure EVENT_TYPE is included
          ],
          maxResults: "1"
        },
        id: 1
      }],
      { headers }
    );

    const catalog = catalogResponse.data[0]?.result?.[0];
    if (!catalog) {
      return res.status(404).json({ error: "Market catalog not found" });
    }

    const rules = catalog.description?.rules || "No rules available.";

    // 🧠 2. Get Market Book
    const bookResponse = await axios.post(
      'https://api.betfair.com/exchange/betting/json-rpc/v1',
      [{
        jsonrpc: "2.0",
        method: "SportsAPING/v1.0/listMarketBook",
        params: {
          marketIds: [marketId],
          priceProjection: { priceData: ["EX_BEST_OFFERS"] }
        },
        id: 2
      }],
      { headers }
    );

    const book = bookResponse.data[0]?.result?.[0];
    if (!book) {
      return res.status(404).json({ error: "Market book not found" });
    }
  // ... (previous code remains the same until sport mapping)

const eventTypeId = catalog.eventType?.id || null; // Correctly extract eventTypeId
const eventTypeName = catalog.eventType?.name || "Unknown"; // Extract eventType name

const sportMapById = {
  "4": "Cricket",
  "2": "Tennis",
  "7": "Horse Racing",
  "1": "Football",
  "4339": "Greyhound",  // Greyhound ka ID (jo betfair ka hai, yeh check kar lena)
  // Agar aur sports chahiye to yahan add kar sakte ho
};

const sportIconMap = {
  "Cricket": "cricket.svg",
  "Tennis": "tennis.svg",
  "Horse Racing": "horse.svg",
  "Football": "soccer.svg",
  "Greyhound": "greyhound-racing.svg",  // Greyhound ka icon file
  "Unknown": "default.svg",
};

let sportName = eventTypeName; // Use the eventType name directly
if (eventTypeId && sportMapById[eventTypeId]) {
  sportName = sportMapById[eventTypeId]; // Override with mapped name if ID exists
}

const sportIcon = sportIconMap[sportName] || "default.svg";

    const response = {
      marketId: catalog.marketId,
      marketName: catalog.marketName,
      marketStartTime: catalog.marketStartTime,
      suspendTime: null,
      settleTime: null,
      bettingType: catalog.description?.bettingType || "ODDS",
      isTurnInPlayEnabled: book.isTurnInPlay,
      marketType: catalog.marketType,
      priceLadderDetails: catalog.description?.priceLadderDescription || "CLASSIC",
      eventTypeId: eventTypeId,
      eventType: sportName,

      eventId: catalog.event?.id,
      eventName: catalog.event?.name,
      competitionId: catalog.competition?.id,
      winners: catalog.description?.numberOfWinners || 1,
      status: book.status,
      countryCode: catalog.description?.countryCode || "GB",
      rules: rules,
      maxBetSize: 5000000,
      origin: "BETFAIR",
      externalId: null,
      settleAttempts: 0,
      maxExposure: 30000000,
      betDelay: book.betDelay,
      news: "",
      unmatchBet: true,
      sizeOverride: false,
      sortPriority: -1,
      cancelDelay: 0,
      maxOdds: 120,
      runners: catalog.runners.map(runner => ({
        marketId: catalog.marketId,
        selectionId: runner.selectionId,
        runnerName: runner.runnerName,
        handicap: runner.handicap,
        sortPriority: runner.sortPriority,
        status: "ACTIVE",
        removalDate: null,
        silkColor: "",
        score: null,
        adjFactor: null,
        metadata: JSON.stringify({ runnerId: runner.selectionId }),
        jockeyName: "",
        trainerName: "",
        age: "",
        weight: "",
        lastRun: "",
        wearing: "",
        state: 0
      })),

      sport: {
      name: sportName,
      image: sportIcon,

        active: true,
        // image: "cricket.svg",
        autoOpen: false,
        allowSubMarkets: false,
        amountRequired: 100000,
        maxBet: 5000000,
        autoOpenMinutes: 9999,
        betDelay: 0,
        unmatchBet: true
      },
      marketStartTimeUtc: catalog.marketStartTime,
      suspendTimeUtc: null,
      settleTimeUtc: null,
      raceName: null,
      minutesToOpenMarket: 9999,
      statusOverride: 0,
      hasFancyOdds: false,
      isFancy: false,
      isLocalFancy: false,
      isBmMarket: true,
      eventType: "Cricket",
      hasSessionMarkets: false,
      hasBookmakerMarkets: false,
      updatedAt: new Date().toISOString(),
      casinoPl: null,
      removedRunnersCount: 0,
      state: 0
    };

    return res.json(response);

  } catch (err) {
    console.error("Catalog2 Error:", err.message);
    return res.status(500).json({
      error: "Failed to fetch catalog2 market",
      details: err.response?.statusText || err.message
    });
  }
});



router.get('/Data', async (req, res) => {
  const marketId = req.query.id;
  if (!marketId) {
    return res.status(400).json({ status: 'error', message: 'Market ID is required' });
  }

  try {
    const token = "7cJ1B9qC2VOUGQHhzwxcDuNEP90ovsJmWBcRmJDRpuU=";
    const headers = {
      'X-Application': APP_KEY,
      'X-Authentication': token,
      'Content-Type': 'application/json'
    };

    // Step 1: Get runners info from MarketCatalogue
    const catalogRes = await axios.post(
      'https://api.betfair.com/exchange/betting/json-rpc/v1',
      [{
        jsonrpc: "2.0",
        method: "SportsAPING/v1.0/listMarketCatalogue",
        params: {
          filter: { marketIds: [marketId] },
          marketProjection: ["RUNNER_DESCRIPTION"],
          maxResults: "1"
        },
        id: 1
      }],
      { headers }
    );
    const catalog = catalogRes.data[0]?.result?.[0];
    // Map: selectionId => runnerName
    const runnerMap = {};
    if (catalog && catalog.runners) {
      catalog.runners.forEach(r => {
        runnerMap[r.selectionId] = r.runnerName;
      });
    }

    // Step 2: Get MarketBook (odds)
    const bookResponse = await axios.post(
      'https://api.betfair.com/exchange/betting/json-rpc/v1',
      [{
        jsonrpc: "2.0",
        method: "SportsAPING/v1.0/listMarketBook",
        params: {
          marketIds: [marketId],
          priceProjection: { priceData: ["EX_BEST_OFFERS"] }
        },
        id: 2
      }],
      { headers }
    );

    const bfBook = bookResponse.data[0]?.result;
    let marketBooks = [];
    if (bfBook && bfBook.length) {
      marketBooks = bfBook.map(book => ({
        id: book.marketId,
        winners: 1,
        betDelay: book.betDelay,
        totalMatched: book.totalMatched,
        marketStatus: book.status,
        maxBetSize: 0,
        bettingAllowed: true,
        isMarketDataDelayed: book.isMarketDataDelayed,
        runners: book.runners.map(runner => ({
          id: runner.selectionId,
          name: runnerMap[runner.selectionId] || '', // Yeh runner ka naam hai (frontend ke liye zaroori!)
          price1: runner.ex.availableToBack?.[0]?.price || 0,
          price2: runner.ex.availableToBack?.[1]?.price || 0,
          price3: runner.ex.availableToBack?.[2]?.price || 0,
          size1: runner.ex.availableToBack?.[0]?.size || 0,
          size2: runner.ex.availableToBack?.[1]?.size || 0,
          size3: runner.ex.availableToBack?.[2]?.size || 0,
          lay1: runner.ex.availableToLay?.[0]?.price || 0,
          lay2: runner.ex.availableToLay?.[1]?.price || 0,
          lay3: runner.ex.availableToLay?.[2]?.price || 0,
          ls1: runner.ex.availableToLay?.[0]?.size || 0,
          ls2: runner.ex.availableToLay?.[1]?.size || 0,
          ls3: runner.ex.availableToLay?.[2]?.size || 0,
          status: runner.status,
          handicap: runner.handicap
        })),
        isRoot: false,
        timestamp: book.lastMatchTime || "0001-01-01T00:00:00",
        winnerIDs: []
      }));
    }

    res.json({
      requestId: uuidv4(),
      marketBooks,
      news: ""
    });

  } catch (err) {
    console.error('❌ Error in GET /Data/:id:', err.message);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch market from Betfair or scoreboard provider',
      details: err.response?.statusText || err.message
    });
  }
});

router.get('/live/greyhound', async (req, res) => {
  try {
    const sessionToken = "7cJ1B9qC2VOUGQHhzwxcDuNEP90ovsJmWBcRmJDRpuU=";

    // 🐕 Step 1: Get greyhound racing events (AU & GB only)
    const eventsResponse = await axios.post(
      'https://api.betfair.com/exchange/betting/json-rpc/v1',
      [
        {
          jsonrpc: '2.0',
          method: 'SportsAPING/v1.0/listEvents',
          params: {
            filter: {
              eventTypeIds: ['4339'], // Greyhound Racing
              marketStartTime: {
                from: new Date().toISOString()
              },
              marketCountries: ['AU', 'GB'] // ✅ Only AU & GB
            }
          },
          id: 1
        }
      ],
      {
        headers: {
          'X-Application': APP_KEY,
          'X-Authentication': sessionToken,
          'Content-Type': 'application/json'
        }
      }
    );

    const events = eventsResponse.data[0]?.result || [];
    const eventIds = events.map(e => e.event.id);

    // 🐕 Step 2: Get market catalogue (WIN markets)
    const marketCatalogueResponse = await axios.post(
      'https://api.betfair.com/exchange/betting/json-rpc/v1',
      [
        {
          jsonrpc: '2.0',
          method: 'SportsAPING/v1.0/listMarketCatalogue',
          params: {
            filter: {
              eventIds: eventIds,
              marketTypeCodes: ['WIN']
            },
            maxResults: '10',
            marketProjection: ['EVENT', 'RUNNER_METADATA']
          },
          id: 2
        }
      ],
      {
        headers: {
          'X-Application': APP_KEY,
          'X-Authentication': sessionToken,
          'Content-Type': 'application/json'
        }
      }
    );

    const marketCatalogues = marketCatalogueResponse.data[0]?.result || [];
    const marketIds = marketCatalogues.map(m => m.marketId);

    // 🐕 Step 3: Get market books (odds + volume)
    const marketBookResponse = await axios.post(
      'https://api.betfair.com/exchange/betting/json-rpc/v1',
      [
        {
          jsonrpc: '2.0',
          method: 'SportsAPING/v1.0/listMarketBook',
          params: {
            marketIds: marketIds,
            priceProjection: {
              priceData: ['EX_BEST_OFFERS']
            }
          },
          id: 3
        }
      ],
      {
        headers: {
          'X-Application': APP_KEY,
          'X-Authentication': sessionToken,
          'Content-Type': 'application/json'
        }
      }
    );

    const marketBooks = marketBookResponse.data[0]?.result || [];

    // 🔄 Combine data
    let finalData = marketCatalogues.map(market => {
      const matchingBook = marketBooks.find(b => b.marketId === market.marketId);
      const event = events.find(e => e.event.id === market.event.id);

      return {
        marketId: market.marketId,
        match: event?.event.name,
        startTime: event?.event.openDate,
        totalMatched: matchingBook?.totalMatched,
        selections: market.runners.map(runner => {
          const runnerBook = matchingBook?.runners.find(r => r.selectionId === runner.selectionId);
          return {
            name: runner.runnerName,
            back: runnerBook?.ex?.availableToBack?.slice(0, 3).map(b => ({
              price: b.price,
              size: b.size
            })) || [],
            lay: runnerBook?.ex?.availableToLay?.slice(0, 3).map(l => ({
              price: l.price,
              size: l.size
            })) || []
          };
        })
      };
    });

    // 📅 Time wise sort (ascending)
    finalData.sort((a, b) => new Date(a.startTime) - new Date(b.startTime));

    res.status(200).json({
      status: 'success',
      data: finalData
    });

  } catch (err) {
    console.error('❌ Greyhound Racing API Error:', err.message);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch greyhound racing odds',
      error: err.message
    });
  }
});

router.get('/live/:sport', async(req, res) => {
const sportName = req.params.sport.toLowerCase();

  // Map sport names to Betfair eventTypeIds
  const sportMap = {
    cricket: 4,
    horse: 4339,
    tennis: 2,
    greyhound: 4338,
    football: 1,
  };

  const eventTypeId = sportMap[sportName];
  if (!eventTypeId) {
    return res.status(400).json({ status: 'error', message: 'Invalid sport', data: [] });
  }

  try {
    const token = "7cJ1B9qC2VOUGQHhzwxcDuNEP90ovsJmWBcRmJDRpuU=";

    const headers = {
      'X-Application': APP_KEY,
      'X-Authentication': token,
      'Content-Type': 'application/json',
    };

    // Step 1: Get Market Catalogue for that sport (filter by eventTypeId)
    const catalogueResponse = await axios.post(
      'https://api.betfair.com/exchange/betting/json-rpc/v1',
      [{
        jsonrpc: "2.0",
        method: "SportsAPING/v1.0/listMarketCatalogue",
        params: {
          filter: { eventTypeIds: [eventTypeId], marketStartTime: { from: new Date().toISOString() } },
          marketProjection: ["MARKET_START_TIME", "RUNNER_DESCRIPTION", "EVENT"],
          maxResults: 5
        },
        id: 1
      }],
      { headers }
    );

    const markets = catalogueResponse.data[0].result;

    if (!markets || markets.length === 0) {
      return res.json({ status: 'success', data: [] });
    }

    // Step 2: Get Market Book (odds) for these markets
    const marketIds = markets.map(m => m.marketId);

    const bookResponse = await axios.post(
      'https://api.betfair.com/exchange/betting/json-rpc/v1',
      [{
        jsonrpc: "2.0",
        method: "SportsAPING/v1.0/listMarketBook",
        params: {
          marketIds: marketIds,
          priceProjection: { priceData: ["EX_BEST_OFFERS"] }
        },
        id: 2
      }],
      { headers }
    );

    const marketBooks = bookResponse.data[0].result;

    // Merge catalog and book info into a single array
    const liveMarkets = markets.map(market => {
      const book = marketBooks.find(b => b.marketId === market.marketId);

      return {
        marketId: market.marketId,
        match: market.event.name,
        startTime: market.marketStartTime,
        inPlay: book?.inplay || false,
        totalMatched: book?.totalMatched || 0,
        odds: book?.runners?.map(runner => ({
          selectionId: runner.selectionId,
          runnerName: runner.runnerName,
          lastPriceTraded: runner.lastPriceTraded,
          availableToBack: runner.ex.availableToBack,
          availableToLay: runner.ex.availableToLay,
        })) || []
      };
    });

    return res.json({ status: 'success', data: liveMarkets });

  } catch (error) {
    console.error("Betfair API error:", error.message);
    return res.status(500).json({ status: 'error', message: 'Failed to fetch data', data: [] });
  }
});
router.get('/scorecard/:marketId', async (req, res) => {
  try {
    const { marketId } = req.params;
    const sessionToken = "7cJ1B9qC2VOUGQHhzwxcDuNEP90ovsJmWBcRmJDRpuU=";

    // ⚠️ Betfair me scorecard ke liye actual endpoint chahiye hoga
    const response = await axios.post(
      'https://api.betfair.com/exchange/betting/rest/v1.0/listMarketBook/',
      [
        {
          marketId: marketId,
          priceProjection: {
            priceData: ['EX_BEST_OFFERS']
          }
        }
      ],
      {
        headers: {
          'X-Application': APP_KEY,
          'X-Authentication': sessionToken,
          'Content-Type': 'application/json'
        }
      }
    );

    res.json({
      status: 'success',
      data: response.data
    });
  } catch (err) {
    console.error('❌ Scorecard Fetch Error:', err.message);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch scorecard',
      error: err.message
    });
  }
});

router.get('/:marketId', async (req, res) => {
  try {
    const marketId = req.params.marketId;
    console.log(`Fetching market with ID: ${marketId}`);
    
    // Try to get market from database
    const db = mongoose.connection.db;
    
    // Check if markets collection exists
    const collections = await db.listCollections({ name: 'markets' }).toArray();
    if (collections.length > 0) {
      console.log('Markets collection found, fetching data...');
      
      // Get market from database
      const market = await db.collection('markets').findOne({ id: marketId });
      
      if (market) {
        console.log(`Found market ${marketId} in database`);
        
        // Remove MongoDB ID
        const { _id, ...marketData } = market;
        
        // Return market from database
        return res.json({
          status: 'success',
          data: marketData
        });
      }
    }
    
    // If market not found in database, check mock data
    const mockMarket = mockPopularMarkets.find(m => m.id === marketId);
    
    if (mockMarket) {
      console.log(`Found mock market for ID ${marketId}`);
      return res.json({
        status: 'success',
        data: {
          ...mockMarket,
          description: `${mockMarket.sport} - ${mockMarket.name}`,
          inPlay: false,
          numberOfRunners: 3,
          numberOfWinners: 1,
          totalMatched: mockMarket.total_matched,
          runners: [
            {
              selectionId: 1,
              runnerName: mockMarket.name.split(' v ')[0],
              handicap: 0,
              sortPriority: 1
            },
            {
              selectionId: 2,
              runnerName: 'Draw',
              handicap: 0,
              sortPriority: 2
            },
            {
              selectionId: 3,
              runnerName: mockMarket.name.split(' v ')[1]?.split(' / ')[0] || 'Away',
              handicap: 0,
              sortPriority: 3
            }
          ]
        }
      });
    }
    
    // Market not found
    return res.status(404).json({
      status: 'error',
      message: `Market with ID ${marketId} not found`
    });
  } catch (error) {
    console.error(`Error fetching market ${req.params.marketId}:`, error);
    return res.status(500).json({
      status: 'error',
      message: `Failed to get market ${req.params.marketId}`,
      error: error.message
    });
  }
});

// const express = require('express');
// const router = express.Router();

// ✅ Replace with your real App Key and Session Token


    

    

        
        

module.exports = router;






















      