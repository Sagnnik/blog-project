from PIL import Image
import time
import os
import io

def compress_image(in_img, max_size=1000000, min_quality=5, max_quality=95):
    start = time.time()
    old_size = os.path.getsize(in_img)

    img = Image.open(in_img)
    if img.mode in ('RGBA', "P"):
        img= img.convert("RGB")

    #Binary search for best quality
    low, high = min_quality, max_quality
    best_quality = low
    best_out = None

    while low<=high:
        mid = (low+high) // 2
        buffer = io.BytesIO()
        img.save(buffer, "JPEG", quality=mid, optimize=True)
        size = buffer.tell() # gives the last cursor position in the stream = size in bytes

        if size<=max_size:
            best_quality = mid
            best_out = buffer.getvalue()
            low = mid+1

        else:
            high = mid-1

    if best_out:
        out_img = f"com_{best_quality}.jpg"
        with open(out_img, "wb") as f:
            f.write(best_out)

    else:
        raise ValueError("Could'nt compress below target size")
    
    end = time.time()

    new_size = os.path.getsize(out_img)
    print(f"Compressed in {end - start:.2f}s | Quality={best_quality}")
    print(f"Old size: {old_size/1024:.2f} KB --> New size: {new_size/1024:.2f} KB")


compress_image("second.jpg")