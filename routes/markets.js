/**
 * Markets API Routes
 * Handles all market-related API endpoints
 */

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const config = require('../config');
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
// const axios = require('axios');

const APP_KEY = '8sCvSYczC1qAr27v'; // ✅ your actual Betfair App Key
const USERNAME = 'latifsohu@hotmail.com'; // ✅ your Betfair username
const PASSWORD = 'Bahria@2026'; // ✅ your Betfair password

// 🔐 Get session token from Betfair login API
async function getSessionToken() {
  const loginUrl = 'https://identitysso.betfair.com/api/login';

  const payload = new URLSearchParams({
    username: USERNAME,
    password: PASSWORD
  });

  try {
    const response = await axios.post(loginUrl, payload, {
      headers: {
        'X-Application': APP_KEY,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    if (response.data.status === 'SUCCESS') {
      console.log('✅ Logged in to Betfair');
      return response.data.token;
    } else {
      console.error('❌ Login failed:', response.data);
      throw new Error('Login failed: ' + response.data.error);
    }
  } catch (error) {
    console.error('❌ Login Error:', error.message);
    throw error;
  }
}

// 🚀 Fetch live markets (auto-login)




// 🚀 Fetch live markets for multiple sports


// 🎯 Fetch live cricket markets only

router.get('/live/cricket', async (req, res) => {
  try {
    const sessionToken = await getSessionToken();

    // 🎯 Step: List upcoming cricket events with start time
    const eventsResponse = await axios.post(
      'https://api.betfair.com/exchange/betting/json-rpc/v1',
      [
        {
          jsonrpc: '2.0',
          method: 'SportsAPING/v1.0/listEvents',
          params: {
            filter: {
              eventTypeIds: ['4'], // Cricket
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

    // ✅ Extract only event name and start time
    const cricketEvents = events.map(item => ({
      name: item.event.name,
      startTime: item.event.openDate
    }));

    res.status(200).json({
      status: 'success',
      data: cricketEvents
    });
  } catch (err) {
    console.error('❌ Betfair API Error:', err.message);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch cricket events',
      error: err.message
    });
  }
});



  router.get('/live/football', async (req, res) => {
  try {
    const sessionToken = await getSessionToken();

    // 🎯 Step: List upcoming football events with start time
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

    // ✅ Extract only event name and start time
    const footballEvents = events.map(item => ({
      name: item.event.name,
      startTime: item.event.openDate
    }));

    res.status(200).json({
      status: 'success',
      data: footballEvents
    });
  } catch (err) {
    console.error('❌ Betfair API Error:', err.message);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch football events',
      error: err.message
    });
  }
});
router.get('/live/tennis', async (req, res) => {
  try {
    const sessionToken = await getSessionToken();

    const eventsResponse = await axios.post(
      'https://api.betfair.com/exchange/betting/json-rpc/v1',
      [
        {
          jsonrpc: '2.0',
          method: 'SportsAPING/v1.0/listEvents',
          params: {
            filter: {
              eventTypeIds: ['2'], // 🎾 Tennis
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

    const tennisEvents = events
      .map(item => ({
        name: item.event.name,
        startTime: item.event.openDate
      }))
      .filter(event => {
        const lowerName = event.name.toLowerCase();
        return !lowerName.includes("set") &&
               !lowerName.includes("game") &&
               !lowerName.includes("odds");
      });

    res.status(200).json({
      status: 'success',
      data: tennisEvents
    });
  } catch (err) {
    console.error('🎾 Tennis Error:', err.message);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch tennis events',
      error: err.message
    });
  }
});


router.get('/live/horse', async (req, res) => {
  try {
    const sessionToken = await getSessionToken();

    // 🐎 Step: List upcoming horse racing events with start time
    const eventsResponse = await axios.post(
      'https://api.betfair.com/exchange/betting/json-rpc/v1',
      [
        {
          jsonrpc: '2.0',
          method: 'SportsAPING/v1.0/listEvents',
          params: {
            filter: {
              eventTypeIds: ['7'], // 🐎 Horse Racing
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

    // ✅ Extract only event name and start time
    const horseEvents = events.map(item => ({
      name: item.event.name,
      startTime: item.event.openDate
    }));

    res.status(200).json({
      status: 'success',
      data: horseEvents
    });
  } catch (err) {
    console.error('❌ Betfair API Error:', err.message);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch horse racing events',
      error: err.message
    });
  }
});
router.get('/live/greyhound', async (req, res) => {
  try {
    const sessionToken = await getSessionToken();

    // 🐶 Step: List upcoming greyhound racing events with start time
    const eventsResponse = await axios.post(
      'https://api.betfair.com/exchange/betting/json-rpc/v1',
      [
        {
          jsonrpc: '2.0',
          method: 'SportsAPING/v1.0/listEvents',
          params: {
            filter: {
              eventTypeIds: ['4339'], // 🐶 Greyhound Racing
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

    // ✅ Extract only event name and start time
    const greyhoundEvents = events.map(item => ({
      name: item.event.name,
      startTime: item.event.openDate
    }));

    res.status(200).json({
      status: 'success',
      data: greyhoundEvents
    });
  } catch (err) {
    console.error('❌ Betfair API Error:', err.message);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch greyhound racing events',
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
const axios = require('axios');

// ✅ Replace with your real App Key and Session Token


    

    

        
        

module.exports = router;






















      
