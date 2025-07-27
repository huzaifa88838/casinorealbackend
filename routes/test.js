


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
