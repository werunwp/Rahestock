// Test script to check WooCommerce import
const testImport = async () => {
  try {
    console.log('Testing WooCommerce API...');
    
    const response = await fetch('https://akhiyanbd.com/wp-json/wc/v3/products?consumer_key=ck_df67c6ed46dd63571e3b19d3f6bee9f1536e21c8&consumer_secret=cs_3d5e9c3fc81afdc220951f29b037cd12b58c469f&per_page=5&page=1&status=publish');
    
    if (response.ok) {
      const products = await response.json();
      console.log('✅ API is working! Found', products.length, 'products');
      console.log('First product:', products[0]?.name);
    } else {
      console.error('❌ API error:', response.status, response.statusText);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
};

testImport();

