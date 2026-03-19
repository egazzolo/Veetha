export async function analyzePhotoLogMeal(photoUri, token) {
  try {
    const formData = new FormData();
    formData.append('image', {
      uri: photoUri,
      type: 'image/jpeg',
      name: 'food.jpg',
    });

    const response = await fetch('https://api.logmeal.com/v2/image/segmentation/complete', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });

    const data = await response.json();
    console.log('✅ LogMeal response:', JSON.stringify(data).slice(0, 200));

    // Try segmentation_results first (specific dish names)
    let detections = [];

    if (data.segmentation_results && data.segmentation_results.length > 0) {
      detections = data.segmentation_results.flatMap(item =>
        (item.recognition_results || []).map(r => ({
          name: r.name,
          confidence: Math.round((r.prob || 0) * 100),
        }))
      ).filter(d => d.confidence >= 50);
    }

    // Fall back to foodFamily only if segmentation gave nothing
    if (detections.length === 0 && data.foodFamily && data.foodFamily.length > 0) {
      detections = data.foodFamily.map(item => ({
        name: item.name,
        confidence: Math.round((item.prob || 0) * 100),
      })).filter(d => d.confidence >= 50);
    }

    const genericCategories = ['dairy products', 'meat', 'vegetables', 'fruits', 'grains', 'beverages', 'snacks', 'sweets', 'seafood', 'bread', 'ingredients'];
    
    const nonGeneric = detections.filter(d => 
      !genericCategories.includes(d.name.toLowerCase()) && d.confidence >= 70
    );
    
    console.log('🔍 nonGeneric length:', nonGeneric.length, '| detections:', detections.map(d => d.name));
    if (nonGeneric.length > 0) detections = nonGeneric;
    else throw new Error('No specific food detected');
    if (detections.length === 0) throw new Error('No food detected with sufficient confidence');

    console.log('🍽️ LogMeal detections:', detections.slice(0, 3).map(d => `${d.name} (${d.confidence}%)`));

    return {
      foodName: detections[0].name,
      confidence: detections[0].confidence,
      topSuggestions: detections.slice(0, 3),
      allConcepts: detections.slice(0, 5),
    };

  } catch (error) {
    console.error('❌ LogMeal error:', error);
    throw error;
  }
}