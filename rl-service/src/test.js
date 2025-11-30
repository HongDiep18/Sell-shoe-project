const axios = require('axios');

/**
 * Test script for RL Service
 */

const RL_SERVICE_URL = 'http://localhost:5001';

// Test data
const testState = [
    0.5,
    0.3,
    0.8,
    0.2,
    0.6, // Purchase & Engagement
    0.4,
    0.7,
    0.9,
    0.3,
    0.5, // More engagement
    0.6,
    0.4,
    0.8,
    0.7,
    0.2, // Conversion & Satisfaction
    0.3,
    0.5,
    0.4,
    0.6,
    0.7, // Category preferences
];

const testCandidates = [
    { productId: 'prod1', price: 500000, category: 'sneakers' },
    { productId: 'prod2', price: 750000, category: 'boots' },
    { productId: 'prod3', price: 600000, category: 'sneakers' },
    { productId: 'prod4', price: 450000, category: 'sandals' },
    { productId: 'prod5', price: 800000, category: 'boots' },
];

async function testHealthCheck() {
    console.log('\n🔍 Testing Health Check...');
    try {
        const response = await axios.get(`${RL_SERVICE_URL}/health`);
        console.log('✅ Health check passed');
        console.log('Response:', response.data);
        return true;
    } catch (error) {
        console.error('❌ Health check failed:', error.message);
        return false;
    }
}

async function testModelInfo() {
    console.log('\n🔍 Testing Model Info...');
    try {
        const response = await axios.get(`${RL_SERVICE_URL}/model-info`);
        console.log('✅ Model info retrieved');
        console.log('Response:', response.data);
        return true;
    } catch (error) {
        console.error('❌ Model info failed:', error.message);
        return false;
    }
}

async function testRankProducts() {
    console.log('\n🔍 Testing Rank Products...');
    try {
        const response = await axios.post(`${RL_SERVICE_URL}/rank-products`, {
            state: testState,
            candidates: testCandidates,
        });

        console.log('✅ Rank products passed');
        console.log('Response:', JSON.stringify(response.data, null, 2));

        // Verify results
        const { recommended, total, topK } = response.data;
        console.log(`\n📊 Results:`);
        console.log(`  Total candidates: ${total}`);
        console.log(`  Top K returned: ${topK}`);
        console.log(`\n🏆 Rankings:`);
        recommended.forEach((item, idx) => {
            console.log(`  ${idx + 1}. ${item.productId} - Score: ${item.score.toFixed(4)}`);
        });

        return true;
    } catch (error) {
        console.error('❌ Rank products failed:', error.message);
        if (error.response) {
            console.error('Error response:', error.response.data);
        }
        return false;
    }
}

async function testBatchRanking() {
    console.log('\n🔍 Testing Batch Ranking...');
    try {
        const requests = [
            { state: testState, candidates: testCandidates },
            { state: testState.map((x) => x * 0.8), candidates: testCandidates },
        ];

        const response = await axios.post(`${RL_SERVICE_URL}/batch-rank-products`, {
            requests,
        });

        console.log('✅ Batch ranking passed');
        console.log(`  Processed ${response.data.total} requests`);

        return true;
    } catch (error) {
        console.error('❌ Batch ranking failed:', error.message);
        return false;
    }
}

async function testInvalidInput() {
    console.log('\n🔍 Testing Invalid Input Handling...');
    try {
        // Test with invalid state dimension
        await axios.post(`${RL_SERVICE_URL}/rank-products`, {
            state: [0.5, 0.3], // Only 2 dimensions instead of 20
            candidates: testCandidates,
        });

        console.error('❌ Should have failed with invalid state');
        return false;
    } catch (error) {
        if (error.response && error.response.status === 400) {
            console.log('✅ Invalid input correctly rejected');
            console.log('Error message:', error.response.data.message);
            return true;
        }
        console.error('❌ Unexpected error:', error.message);
        return false;
    }
}

async function runAllTests() {
    console.log('='.repeat(60));
    console.log('🧪 RL Service Test Suite');
    console.log('='.repeat(60));

    const results = {
        healthCheck: false,
        modelInfo: false,
        rankProducts: false,
        batchRanking: false,
        invalidInput: false,
    };

    // Run tests
    results.healthCheck = await testHealthCheck();

    if (!results.healthCheck) {
        console.log('\n❌ Service not available. Make sure to start the server first:');
        console.log('   npm start');
        process.exit(1);
    }

    results.modelInfo = await testModelInfo();
    results.rankProducts = await testRankProducts();
    results.batchRanking = await testBatchRanking();
    results.invalidInput = await testInvalidInput();

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 Test Summary');
    console.log('='.repeat(60));

    const passed = Object.values(results).filter((r) => r).length;
    const total = Object.keys(results).length;

    Object.entries(results).forEach(([test, passed]) => {
        const icon = passed ? '✅' : '❌';
        console.log(`${icon} ${test}`);
    });

    console.log('─'.repeat(60));
    console.log(`Result: ${passed}/${total} tests passed`);
    console.log('='.repeat(60));

    if (passed === total) {
        console.log('\n🎉 All tests passed!');
        process.exit(0);
    } else {
        console.log('\n⚠️  Some tests failed');
        process.exit(1);
    }
}

// Run tests
runAllTests().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
});
