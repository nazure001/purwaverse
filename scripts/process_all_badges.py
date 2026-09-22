import os
import json
import numpy as np
from PIL import Image
from scipy.ndimage import binary_fill_holes, label, gaussian_filter
from collections import deque

BADGE_CATALOG = [
    # --- BATCH 1 (9 Badges) ---
    {"batch": 1, "id": "badge-curious-observer", "slug": "badge_curious_observer", "name": "Curious Observer", "tier": "bronze", "cx": 198, "cy": 250, "rw": 150, "rh": 155, "desc": "Menyelesaikan Mission 0"},
    {"batch": 1, "id": "badge-first-blood", "slug": "badge_first_blood", "name": "First Blood", "tier": "bronze", "cx": 461, "cy": 250, "rw": 150, "rh": 155, "desc": "Menyelesaikan 1 misi pertama"},
    {"batch": 1, "id": "badge-scholar", "slug": "badge_scholar", "name": "Scholar", "tier": "bronze", "cx": 751, "cy": 250, "rw": 150, "rh": 155, "desc": "Menyelesaikan rangkuman unit"},
    {"batch": 1, "id": "badge-streak-master", "slug": "badge_streak_master", "name": "Streak Master", "tier": "silver", "cx": 1044, "cy": 250, "rw": 150, "rh": 155, "desc": "Menyelesaikan 3 misi berturut-turut"},
    {"batch": 1, "id": "badge-hyperdrive", "slug": "badge_hyperdrive", "name": "Hyperdrive", "tier": "silver", "cx": 1306, "cy": 250, "rw": 150, "rh": 155, "desc": "Menyelesaikan 7 misi"},
    {"batch": 1, "id": "badge-night-owl", "slug": "badge_night_owl", "name": "Night Owl", "tier": "silver", "cx": 290, "cy": 635, "rw": 150, "rh": 155, "desc": "Belajar di malam hari"},
    {"batch": 1, "id": "badge-master-of-logic", "slug": "badge_master_of_logic", "name": "Master of Logic", "tier": "silver", "cx": 582, "cy": 635, "rw": 150, "rh": 155, "desc": "Mission 0 dengan research readiness tinggi"},
    {"batch": 1, "id": "badge-galaxy-explorer", "slug": "badge_galaxy_explorer", "name": "Galaxy Explorer", "tier": "gold", "cx": 905, "cy": 635, "rw": 150, "rh": 155, "desc": "Menyelesaikan 15 misi"},
    {"batch": 1, "id": "badge-flawless-crown", "slug": "badge_flawless_crown", "name": "Flawless Crown", "tier": "gold", "cx": 1202, "cy": 635, "rw": 150, "rh": 155, "desc": "3 kali kuis skor sempurna"},

    # --- BATCH 2 (10 Badges) ---
    {"batch": 2, "id": "badge-active-note-taker", "slug": "badge_active_note_taker", "name": "Active Note Taker", "tier": "bronze", "cx": 180, "cy": 250, "rw": 145, "rh": 155, "desc": "Mengirim rangkuman pertama ke guru"},
    {"batch": 2, "id": "badge-lab-explorer", "slug": "badge_lab_explorer", "name": "Lab Explorer", "tier": "bronze", "cx": 454, "cy": 250, "rw": 145, "rh": 155, "desc": "Menyelesaikan 5 praktik/LKPD"},
    {"batch": 2, "id": "badge-problem-solver", "slug": "badge_problem_solver", "name": "Problem Solver", "tier": "silver", "cx": 772, "cy": 250, "rw": 145, "rh": 155, "desc": "Menunjukkan ketekunan dalam menyelesaikan tantangan"},
    {"batch": 2, "id": "badge-team-player", "slug": "badge_team_player", "name": "Team Player", "tier": "silver", "cx": 1046, "cy": 250, "rw": 145, "rh": 155, "desc": "Aktif berkontribusi dalam kerja tim"},
    {"batch": 2, "id": "badge-independent-learner", "slug": "badge_independent_learner", "name": "Independent Learner", "tier": "gold", "cx": 1338, "cy": 250, "rw": 145, "rh": 155, "desc": "Konsisten belajar dengan inisiatif sendiri"},
    {"batch": 2, "id": "badge-critical-thinker", "slug": "badge_critical_thinker", "name": "Critical Thinker", "tier": "silver", "cx": 202, "cy": 635, "rw": 145, "rh": 155, "desc": "Mampu menganalisis fenomena secara ilmiah"},
    {"batch": 2, "id": "badge-consistent-learner", "slug": "badge_consistent_learner", "name": "Consistent Learner", "tier": "gold", "cx": 446, "cy": 635, "rw": 145, "rh": 155, "desc": "Menjaga progres belajar secara konsisten"},
    {"batch": 2, "id": "badge-knowledge-builder", "slug": "badge_knowledge_builder", "name": "Knowledge Builder", "tier": "gold", "cx": 765, "cy": 635, "rw": 145, "rh": 155, "desc": "Menyelesaikan 1 bab penuh"},
    {"batch": 2, "id": "badge-chapter-champion", "slug": "badge_chapter_champion", "name": "Chapter Champion", "tier": "gold", "cx": 1042, "cy": 635, "rw": 145, "rh": 155, "desc": "Menyelesaikan semua submateri dalam 1 bab"},
    {"batch": 2, "id": "badge-purwaverse-scientist", "slug": "badge_purwaverse_scientist", "name": "Purwaverse Scientist", "tier": "legendary", "cx": 1338, "cy": 635, "rw": 145, "rh": 155, "desc": "Menyelesaikan seluruh misi semester"},

    # --- BATCH 3 (15 Badges) ---
    {"batch": 3, "id": "badge-consistent-note-taker", "slug": "badge_consistent_note_taker", "name": "Consistent Note Taker", "tier": "bronze", "cx": 185, "cy": 195, "rw": 115, "rh": 115, "desc": "Mengirim rangkuman secara konsisten"},
    {"batch": 3, "id": "badge-quiz-starter", "slug": "badge_quiz_starter", "name": "Quiz Starter", "tier": "bronze", "cx": 477, "cy": 195, "rw": 115, "rh": 115, "desc": "Menyelesaikan kuis pertama"},
    {"batch": 3, "id": "badge-young-scientist", "slug": "badge_young_scientist", "name": "Young Scientist", "tier": "silver", "cx": 750, "cy": 195, "rw": 115, "rh": 115, "desc": "Menyelesaikan praktik pertama"},
    {"batch": 3, "id": "badge-experimentalist", "slug": "badge_experimentalist", "name": "Experimentalist", "tier": "silver", "cx": 1041, "cy": 195, "rw": 115, "rh": 115, "desc": "Menyelesaikan 5 praktik/LKPD"},
    {"batch": 3, "id": "badge-collaborator", "slug": "badge_collaborator", "name": "Collaborator", "tier": "silver", "cx": 1315, "cy": 195, "rw": 115, "rh": 115, "desc": "Aktif bekerja sama dalam tim"},
    {"batch": 3, "id": "badge-observation-pro", "slug": "badge_observation_pro", "name": "Observation Pro", "tier": "gold", "cx": 185, "cy": 475, "rw": 115, "rh": 115, "desc": "Teliti dalam mengamati dan mencatat data"},
    {"batch": 3, "id": "badge-analytical-mind", "slug": "badge_analytical_mind", "name": "Analytical Mind", "tier": "gold", "cx": 477, "cy": 475, "rw": 115, "rh": 115, "desc": "Mampu menganalisis fenomena dengan baik"},
    {"batch": 3, "id": "badge-creative-thinker", "slug": "badge_creative_thinker", "name": "Creative Thinker", "tier": "gold", "cx": 750, "cy": 475, "rw": 115, "rh": 115, "desc": "Menunjukkan ide atau solusi kreatif"},
    {"batch": 3, "id": "badge-mission-complete", "slug": "badge_mission_complete", "name": "Mission Complete", "tier": "gold", "cx": 1041, "cy": 475, "rw": 115, "rh": 115, "desc": "Menyelesaikan seluruh misi semester"},
    {"batch": 3, "id": "badge-semester-champion", "slug": "badge_semester_champion", "name": "Semester Champion", "tier": "gold", "cx": 1315, "cy": 475, "rw": 115, "rh": 115, "desc": "Menyelesaikan semua submateri dalam 1 semester"},
    {"batch": 3, "id": "badge-science-ambassador", "slug": "badge_science_ambassador", "name": "Science Ambassador", "tier": "legendary", "cx": 185, "cy": 745, "rw": 115, "rh": 115, "desc": "Aktif menyebarkan semangat belajar IPA"},
    {"batch": 3, "id": "badge-innovation-creator", "slug": "badge_innovation_creator", "name": "Innovation Creator", "tier": "legendary", "cx": 477, "cy": 745, "rw": 115, "rh": 115, "desc": "Menghasilkan karya tugas/penelitian terbaik"},
    {"batch": 3, "id": "badge-beyond-explorer", "slug": "badge_beyond_explorer", "name": "Beyond Explorer", "tier": "legendary", "cx": 750, "cy": 745, "rw": 115, "rh": 115, "desc": "Selalu ingin tahu lebih jauh"},
    {"batch": 3, "id": "badge-future-scientist", "slug": "badge_future_scientist", "name": "Future Scientist", "tier": "legendary", "cx": 1041, "cy": 745, "rw": 115, "rh": 115, "desc": "Menunjukkan potensi tinggi di bidang sains"},
    {"batch": 3, "id": "badge-purwaverse-legend", "slug": "badge_purwaverse_legend", "name": "Purwaverse Legend", "tier": "legendary", "cx": 1315, "cy": 745, "rw": 115, "rh": 115, "desc": "Menyelesaikan seluruh perjalanan belajar IPA VIII"},

    # --- BATCH 4 (15 Badges) ---
    {"batch": 4, "id": "badge-new-beginning", "slug": "badge_new_beginning", "name": "New Beginning", "tier": "bronze", "cx": 200, "cy": 195, "rw": 115, "rh": 115, "desc": "Memulai perjalanan belajar di Purwaverse"},
    {"batch": 4, "id": "badge-knowledge-seeker", "slug": "badge_knowledge_seeker", "name": "Knowledge Seeker", "tier": "bronze", "cx": 475, "cy": 195, "rw": 115, "rh": 115, "desc": "Membuka dan membaca materi pertama"},
    {"batch": 4, "id": "badge-task-finisher", "slug": "badge_task_finisher", "name": "Task Finisher", "tier": "bronze", "cx": 735, "cy": 195, "rw": 115, "rh": 115, "desc": "Menyelesaikan tugas pertama"},
    {"batch": 4, "id": "badge-focus-champion", "slug": "badge_focus_champion", "name": "Focus Champion", "tier": "silver", "cx": 995, "cy": 195, "rw": 115, "rh": 115, "desc": "Konsisten menyelesaikan tugas tepat waktu"},
    {"batch": 4, "id": "badge-discipline-hero", "slug": "badge_discipline_hero", "name": "Discipline Hero", "tier": "silver", "cx": 1255, "cy": 195, "rw": 115, "rh": 115, "desc": "Menjaga konsistensi belajar selama 7 hari"},
    {"batch": 4, "id": "badge-detail-observer", "slug": "badge_detail_observer", "name": "Detail Observer", "tier": "silver", "cx": 200, "cy": 475, "rw": 115, "rh": 115, "desc": "Teliti dalam mengamati dan mencatat informasi"},
    {"batch": 4, "id": "badge-logic-builder", "slug": "badge_logic_builder", "name": "Logic Builder", "tier": "silver", "cx": 475, "cy": 475, "rw": 115, "rh": 115, "desc": "Mampu menghubungkan konsep dengan tepat"},
    {"batch": 4, "id": "badge-hands-on-learner", "slug": "badge_hands_on_learner", "name": "Hands-On Learner", "tier": "gold", "cx": 735, "cy": 475, "rw": 115, "rh": 115, "desc": "Menyelesaikan praktik dengan baik"},
    {"batch": 4, "id": "badge-team-spirit", "slug": "badge_team_spirit", "name": "Team Spirit", "tier": "gold", "cx": 995, "cy": 475, "rw": 115, "rh": 115, "desc": "Aktif bekerja sama dalam tim"},
    {"batch": 4, "id": "badge-progress-maker", "slug": "badge_progress_maker", "name": "Progress Maker", "tier": "gold", "cx": 1255, "cy": 475, "rw": 115, "rh": 115, "desc": "Menunjukkan peningkatan progres belajar yang signifikan"},
    {"batch": 4, "id": "badge-all-quiz-passed", "slug": "badge_all_quiz_passed", "name": "All Quiz Passed", "tier": "gold", "cx": 200, "cy": 745, "rw": 115, "rh": 115, "desc": "Menyelesaikan semua kuis dalam satu bab"},
    {"batch": 4, "id": "badge-chapter-explorer", "slug": "badge_chapter_explorer", "name": "Chapter Explorer", "tier": "gold", "cx": 475, "cy": 745, "rw": 115, "rh": 115, "desc": "Menyelesaikan seluruh submateri dalam 1 bab"},
    {"batch": 4, "id": "badge-science-innovator", "slug": "badge_science_innovator", "name": "Science Innovator", "tier": "legendary", "cx": 735, "cy": 745, "rw": 115, "rh": 115, "desc": "Menunjukkan ide, solusi atau karya terbaik dalam pembelajaran"},
    {"batch": 4, "id": "badge-global-thinker", "slug": "badge_global_thinker", "name": "Global Thinker", "tier": "legendary", "cx": 995, "cy": 745, "rw": 115, "rh": 115, "desc": "Mengaitkan ilmu IPA dengan fenomena dunia nyata"},
    {"batch": 4, "id": "badge-purwaverse-hero", "slug": "badge_purwaverse_hero", "name": "Purwaverse Hero", "tier": "legendary", "cx": 1255, "cy": 745, "rw": 115, "rh": 115, "desc": "Telah menunjukkan dedikasi, kerja keras, dan semangat luar biasa"},

    # --- BATCH 5 (10 Badges) ---
    {"batch": 5, "id": "badge-founder-scientist", "slug": "badge_founder_scientist", "name": "Founder Scientist", "tier": "legendary", "cx": 180, "cy": 250, "rw": 150, "rh": 155, "desc": "Termasuk dalam generasi awal Purwaverse IPA VIII"},
    {"batch": 5, "id": "badge-top-researcher", "slug": "badge_top_researcher", "name": "Top Researcher", "tier": "legendary", "cx": 465, "cy": 250, "rw": 150, "rh": 155, "desc": "Performa riset dan penelitian terbaik"},
    {"batch": 5, "id": "badge-master-engineer", "slug": "badge_master_engineer", "name": "Master Engineer", "tier": "legendary", "cx": 755, "cy": 250, "rw": 150, "rh": 155, "desc": "Unggul dalam praktik, eksperimen, dan inovasi alat"},
    {"batch": 5, "id": "badge-science-strategist", "slug": "badge_science_strategist", "name": "Science Strategist", "tier": "legendary", "cx": 1040, "cy": 250, "rw": 150, "rh": 155, "desc": "Mampu merancang strategi dan solusi ilmiah tingkat tinggi"},
    {"batch": 5, "id": "badge-never-give-up", "slug": "badge_never_give_up", "name": "Never Give Up", "tier": "legendary", "cx": 1330, "cy": 250, "rw": 150, "rh": 155, "desc": "Bangkit setelah perbaikan dan terus mencoba"},
    {"batch": 5, "id": "badge-planet-protector", "slug": "badge_planet_protector", "name": "Planet Protector", "tier": "epic", "cx": 180, "cy": 635, "rw": 150, "rh": 155, "desc": "Peduli terhadap lingkungan dan keberlanjutan bumi"},
    {"batch": 5, "id": "badge-lifelong-learner", "slug": "badge_lifelong_learner", "name": "Lifelong Learner", "tier": "epic", "cx": 465, "cy": 635, "rw": 150, "rh": 155, "desc": "Selalu ingin belajar dan berkembang"},
    {"batch": 5, "id": "badge-explorer-mindset", "slug": "badge_explorer_mindset", "name": "Explorer Mindset", "tier": "epic", "cx": 755, "cy": 635, "rw": 150, "rh": 155, "desc": "Berani mengeekplorasi hal baru di dunia sains"},
    {"batch": 5, "id": "badge-inspiring-friend", "slug": "badge_inspiring_friend", "name": "Inspiring Friend", "tier": "epic", "cx": 1040, "cy": 635, "rw": 150, "rh": 155, "desc": "Memberi dampak positif dan menginspirasi teman lain"},
    {"batch": 5, "id": "badge-ultimate-purwaverse-scientist", "slug": "badge_ultimate_purwaverse_scientist", "name": "Ultimate Purwaverse Scientist", "tier": "mythic", "cx": 1330, "cy": 635, "rw": 150, "rh": 155, "desc": "Menyelesaikan seluruh perjalanan belajar IPA VIII"}
]

def extract_badge(arr, cx, cy, rw, rh):
    h_max, w_max, _ = arr.shape
    x1 = max(0, cx - rw)
    x2 = min(w_max, cx + rw)
    y1 = max(0, cy - rh)
    y2 = min(h_max, cy + rh)
    
    sub = arr[y1:y2, x1:x2]
    sh, sw, _ = sub.shape
    
    r = sub[:, :, 0].astype(float)
    g = sub[:, :, 1].astype(float)
    b = sub[:, :, 2].astype(float)
    
    # Background criterion for blueprint sheet:
    # R is low (< 35), G is low/medium (< 65), B is medium (< 95), and warm component is absent (r < g)
    is_bg = (r < 35) & (g < 65) & (b < 100) & (r <= g + 5)
    
    # Also blueprint grid lines (thin cyan lines): r < 40 and g < 110 and b < 140 and (r < g - 10)
    is_blueprint_line = (r < 40) & (g < 120) & (b < 150) & (r < g - 10)
    is_bg = is_bg | is_blueprint_line
    
    # Floodfill from borders
    visited = np.zeros((sh, sw), dtype=bool)
    queue = deque()
    
    for x in range(sw):
        if is_bg[0, x]:
            visited[0, x] = True
            queue.append((0, x))
        if is_bg[sh-1, x]:
            visited[sh-1, x] = True
            queue.append((sh-1, x))
            
    for y in range(sh):
        if is_bg[y, 0]:
            visited[y, 0] = True
            queue.append((y, 0))
        if is_bg[y, sw-1]:
            visited[y, sw-1] = True
            queue.append((y, sw-1))
            
    while queue:
        cy_curr, cx_curr = queue.popleft()
        for dy, dx in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
            ny, nx = cy_curr + dy, cx_curr + dx
            if 0 <= ny < sh and 0 <= nx < sw and not visited[ny, nx]:
                if is_bg[ny, nx]:
                    visited[ny, nx] = True
                    queue.append((ny, nx))
                    
    fg_mask = ~visited
    
    # Keep only the largest component (the main badge emblem)
    lbl, n_feat = label(fg_mask)
    if n_feat > 0:
        sizes = [(lbl == i).sum() for i in range(1, n_feat + 1)]
        largest = np.argmax(sizes) + 1
        clean_mask = (lbl == largest)
    else:
        clean_mask = fg_mask
        
    clean_mask = binary_fill_holes(clean_mask)
    
    # Smooth alpha edge
    alpha = clean_mask.astype(float) * 255.0
    alpha_smooth = gaussian_filter(alpha, sigma=0.8)
    
    rgba = np.zeros((sh, sw, 4), dtype=np.uint8)
    rgba[:, :, :3] = sub
    rgba[:, :, 3] = np.clip(alpha_smooth, 0, 255).astype(np.uint8)
    
    img = Image.fromarray(rgba)
    bbox = img.getbbox()
    if bbox:
        img_cropped = img.crop(bbox)
    else:
        img_cropped = img
        
    return img_cropped

def make_canvas(badge_cropped, canvas_size=512, target_content_size=440):
    canvas = Image.new('RGBA', (canvas_size, canvas_size), (0, 0, 0, 0))
    w, h = badge_cropped.size
    scale = target_content_size / max(w, h)
    nw, nh = int(w * scale), int(h * scale)
    resized = badge_cropped.resize((nw, nh), Image.Resampling.LANCZOS)
    
    ox = (canvas_size - nw) // 2
    oy = (canvas_size - nh) // 2
    canvas.paste(resized, (ox, oy), resized)
    return canvas

def main():
    print(f"Total badges to process: {len(BADGE_CATALOG)}")
    
    # Prepare master images map
    sheets = {}
    for i in range(1, 6):
        fn = f"public/assets/PURWAVERSE_BADGE_MASTER_BATCH_{i:02d}.png"
        if os.path.exists(fn):
            sheets[i] = np.array(Image.open(fn).convert('RGB'))
            print(f"Loaded Master Batch {i}: {fn}")
        else:
            print(f"Warning: {fn} not found!")

    # Define target directories
    base_dirs = [
        "assets/purwaverse/badges",
        "public/assets/purwaverse/badges"
    ]
    
    for base in base_dirs:
        for tier in ["bronze", "silver", "gold", "legendary", "epic", "mythic", "share", "masters"]:
            os.makedirs(os.path.join(base, tier), exist_ok=True)
            
    database_entries = []
    
    for idx, item in enumerate(BADGE_CATALOG):
        b_idx = item["batch"]
        if b_idx not in sheets:
            continue
        arr = sheets[b_idx]
        
        badge_img = extract_badge(arr, item["cx"], item["cy"], item["rw"], item["rh"])
        
        # 512x512 Master WebP
        badge_512 = make_canvas(badge_img, canvas_size=512, target_content_size=440)
        # 256x256 Display WebP
        badge_256 = make_canvas(badge_img, canvas_size=256, target_content_size=220)
        # 128x128 Thumbnail WebP
        badge_128 = make_canvas(badge_img, canvas_size=128, target_content_size=110)
        
        tier = item["tier"]
        slug = item["slug"]
        
        # Save to both locations
        for base in base_dirs:
            p_512 = os.path.join(base, tier, f"{slug}.webp")
            badge_512.save(p_512, "WEBP", quality=85)
            
            # Display & Thumbnails
            p_256 = os.path.join(base, tier, f"{slug}_display.webp")
            badge_256.save(p_256, "WEBP", quality=85)
            
            p_128 = os.path.join(base, tier, f"{slug}_thumb.webp")
            badge_128.save(p_128, "WEBP", quality=75)
            
        file_size_kb = os.path.getsize(os.path.join(base_dirs[0], tier, f"{slug}.webp")) / 1024.0
        
        db_entry = {
            "id": item["id"],
            "name": item["name"],
            "tier": tier,
            "description": item["desc"],
            "icon": f"assets/purwaverse/badges/{tier}/{slug}.webp",
            "icon_thumb": f"assets/purwaverse/badges/{tier}/{slug}_thumb.webp",
            "icon_display": f"assets/purwaverse/badges/{tier}/{slug}_display.webp",
            "share_text": f"Saya berhasil membuka lencana {item['name']} di Purwaverse IPA VIII!",
            "size_kb": round(file_size_kb, 1)
        }
        database_entries.append(db_entry)
        print(f"[{idx+1}/{len(BADGE_CATALOG)}] Processed: {slug} ({tier}) -> {file_size_kb:.1f} KB")

    # Save database json
    db_json_content = {
        "version": "1.0.0",
        "total_badges": len(database_entries),
        "tiers": ["bronze", "silver", "gold", "epic", "legendary", "mythic"],
        "badges": database_entries
    }
    
    for base in base_dirs:
        with open(os.path.join(base, "badges.json"), "w", encoding="utf-8") as f:
            json.dump(db_json_content, f, indent=2, ensure_ascii=False)
            
    print(f"Badges database saved to badges.json successfully! Total: {len(database_entries)} badges.")

if __name__ == "__main__":
    main()
