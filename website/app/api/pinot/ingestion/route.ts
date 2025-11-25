import { NextResponse } from 'next/server';

const PINOT_BROKER = process.env.PINOT_BROKER_URL || 'http://localhost:8099';
const PINOT_CONTROLLER = process.env.PINOT_CONTROLLER_URL || 'http://localhost:9000';

export async function GET() {
  try {
    // Fetch all tables
    const tablesResponse = await fetch(`${PINOT_CONTROLLER}/tables`);
    
    if (!tablesResponse.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch tables from Pinot' },
        { status: 500 }
      );
    }
    
    const tablesData = await tablesResponse.json();
    const tables = tablesData.tables || [];
    
    const ingestionStatus = await Promise.all(
      tables.map(async (tableName: string) => {
        try {
          // Fetch table details to check if it has REALTIME type
          const tableDetailsResponse = await fetch(
            `${PINOT_CONTROLLER}/tables/${tableName}`
          );
          
          if (!tableDetailsResponse.ok) {
            return null;
          }
          
          const tableDetails = await tableDetailsResponse.json();
          
          // Check if table has REALTIME configuration
          if (!tableDetails.REALTIME) {
            return null; // Skip non-realtime tables
          }
          
          // Fetch consuming segments info
          const consumingResponse = await fetch(
            `${PINOT_CONTROLLER}/tables/${tableName}/consumingSegmentsInfo`
          );
          
          if (!consumingResponse.ok) {
            return {
              table: tableName,
              status: 'error' as const,
              message: 'Failed to fetch ingestion info',
              segments: [],
            };
          }
          
          const consumingData = await consumingResponse.json();
          const segmentMap = consumingData._segmentToConsumingInfoMap || {};
          
          // Parse segment information
          const segments = Object.entries(segmentMap).map(([segmentName, servers]: [string, any]) => {
            const serverInfo = Array.isArray(servers) ? servers[0] : servers;
            const partitionOffsetInfo = serverInfo?.partitionOffsetInfo || {};
            const currentOffsets = partitionOffsetInfo.currentOffsetsMap || {};
            const latestOffsets = partitionOffsetInfo.latestUpstreamOffsetMap || {};
            const recordsLag = partitionOffsetInfo.recordsLagMap || {};
            
            // Calculate total lag across all partitions
            const totalLag = Object.values(recordsLag).reduce(
              (sum: number, lag: any) => sum + (parseInt(lag) || 0),
              0
            );
            
            // Calculate total current offset
            const totalCurrentOffset = Object.values(currentOffsets).reduce(
              (sum: number, offset: any) => sum + (parseInt(offset) || 0),
              0
            );
            
            // Calculate total latest offset
            const totalLatestOffset = Object.values(latestOffsets).reduce(
              (sum: number, offset: any) => sum + (parseInt(offset) || 0),
              0
            );
            
            return {
              segmentName,
              consumerState: serverInfo?.consumerState || 'UNKNOWN',
              serverName: serverInfo?.serverName || 'Unknown',
              lastConsumedTimestamp: serverInfo?.lastConsumedTimestamp || -1,
              partitions: Object.keys(currentOffsets).length,
              currentOffset: totalCurrentOffset,
              latestOffset: totalLatestOffset,
              lag: totalLag,
              partitionDetails: Object.keys(currentOffsets).map(partition => ({
                partition: parseInt(partition),
                currentOffset: parseInt(currentOffsets[partition]) || 0,
                latestOffset: parseInt(latestOffsets[partition]) || 0,
                lag: parseInt(recordsLag[partition]) || 0,
              })),
            };
          });
          
          // Calculate overall status
          const totalLag = segments.reduce((sum, seg) => sum + seg.lag, 0);
          const isConsuming = segments.some(seg => seg.consumerState === 'CONSUMING');
          
          let status: 'healthy' | 'warning' | 'error';
          let message: string;
          
          if (!isConsuming) {
            status = 'error';
            message = 'No active consumers';
          } else if (totalLag > 10000) {
            status = 'warning';
            message = `High lag: ${totalLag.toLocaleString()} records behind`;
          } else if (totalLag > 1000) {
            status = 'warning';
            message = `Moderate lag: ${totalLag.toLocaleString()} records behind`;
          } else {
            status = 'healthy';
            message = totalLag === 0 ? 'Fully caught up' : `${totalLag} records behind`;
          }
          
          return {
            table: tableName,
            status,
            message,
            segments,
            totalLag,
            isConsuming,
          };
        } catch (error) {
          console.error(`Error fetching ingestion info for ${tableName}:`, error);
          return null;
        }
      })
    );
    
    // Filter out null entries (non-realtime tables or errors)
    const filteredStatus = ingestionStatus.filter(status => status !== null);
    
    return NextResponse.json({
      ingestionStatus: filteredStatus,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error in ingestion status endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
