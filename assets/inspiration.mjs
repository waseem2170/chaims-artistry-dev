export function appendInspiration(existing,selected){
 const files=[...existing];
 if(selected.some(f=>!['image/jpeg','image/png','image/webp'].includes(f.type)||f.size>3*1024*1024))throw Error('Choose JPEG, PNG or WebP images no larger than 3 MB each. Your previous images are kept.');
 for(const file of selected)if(!files.some(f=>f.name===file.name&&f.size===file.size&&f.lastModified===file.lastModified))files.push(file);
 if(files.length>2)throw Error('You can add two inspiration images per person. Remove one before adding another. Your previous images are kept.');
 return files;
}
