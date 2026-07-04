package com.spotter.app.data

import androidx.compose.ui.graphics.Color

/** Static source data ported verbatim from the prototype's `renderVals`. */
object SampleData {

    val coaches = listOf(
        Person("c1", "Marcus Reyes", "Strength & Conditioning", 4.9, 213, 45, true, 1.2, "Elite coach", "640+", "~1h",
            "Ex-national powerlifter. I build durable strength with a focus on flawless technique and progressive overload. Beginners to competitors welcome.",
            listOf("Powerlifting", "Hypertrophy", "Mobility", "Beginner-friendly"), isCoach = true),
        Person("c2", "Aïcha Bennani", "Boxing", 4.9, 178, 50, true, 2.4, "Pro boxing", "520+", "~30m",
            "Former amateur champion. Footwork, defense and conditioning for all levels — whether you want to spar or just hit pads and get fit.",
            listOf("Footwork", "Pad work", "Sparring", "Conditioning"), isCoach = true),
        Person("c3", "Diego Santos", "Calisthenics", 4.8, 142, 38, false, 0.8, "Movement", "410+", "~2h",
            "Bodyweight specialist. From your first pull-up to muscle-ups and handstands — we train control, not just reps.",
            listOf("Pull-ups", "Handstands", "Core", "Skill work"), isCoach = true),
        Person("c4", "Lena Hoffmann", "Yoga & Mobility", 4.8, 96, 35, false, 3.1, "Vinyasa", "300+", "~1h",
            "Vinyasa and mobility coach. Build flexibility, breath control and recovery into your training week.",
            listOf("Vinyasa", "Mobility", "Breathwork", "Recovery"), isCoach = true),
        Person("c5", "Tariq Aziz", "Running & Endurance", 4.7, 64, 30, false, 1.9, "Endurance", "180+", "~3h",
            "Marathon coach and pacer. Structured plans, form work and race strategy from 5k to full marathon.",
            listOf("5k–Marathon", "Pacing", "Form", "Race prep"), isCoach = true),
        Person("c6", "Sofia Marino", "Climbing", 4.6, 51, 42, false, 4.0, "Bouldering", "150+", "~2h",
            "Bouldering and lead coach. Technique, route reading and finger strength — indoors and out.",
            listOf("Bouldering", "Lead", "Technique", "Grip"), isCoach = true),
        Person("c7", "Karim Haddad", "Music & Guitar", 4.9, 88, 25, false, 1.4, "Musician", "270+", "~1h",
            "Session guitarist and teacher for 12 years. Acoustic, electric and oud crossover — from your first chords to performing live.",
            listOf("Acoustic", "Electric", "Oud crossover", "Beginners"), isCoach = true),
        Person("c8", "Nour Fakhoury", "Chess", 4.8, 57, 20, false, 2.2, "FIDE 2100", "190+", "~2h",
            "FIDE-rated player. Openings, endgames and practical middlegame plans — lessons over the board at Achrafieh Chess Café.",
            listOf("Openings", "Endgames", "Analysis", "Kids welcome"), isCoach = true),
    )

    val partners = listOf(
        Person("p1", "Jordan K.", "Running", 4.9, 38, null, false, 0.4, "Intermediate", "48", "~20m",
            "Training for a sub-22 5k. Looking for someone to do tempo runs and long Sunday runs with — pace 4:45–5:15/km.",
            listOf("Tempo runs", "Long runs", "Track", "Mornings"), goal = "5k under 22min", isCoach = false),
        Person("p2", "Mei Lin", "Climbing", 4.8, 29, null, false, 1.1, "Advanced", "63", "~1h",
            "Boulderer projecting 6b/V4. Need a regular belay + spotting partner for evenings at the south wall.",
            listOf("Bouldering", "Belay partner", "Evenings", "Projecting"), goal = "Project a 6b", isCoach = false),
        Person("p3", "Sam Okoro", "Calisthenics", 4.7, 21, null, false, 0.9, "Beginner", "31", "~2h",
            "Just started bodyweight training. Want a supportive partner to keep me accountable at the local park bars.",
            listOf("Park workouts", "Accountability", "Weekends"), goal = "First muscle-up", isCoach = false),
        Person("p4", "Elena V.", "Boxing", 4.7, 25, null, false, 2.0, "Intermediate", "40", "~45m",
            "Two years boxing. Looking for a controlled sparring partner around the same level, once a week.",
            listOf("Sparring", "Pad work", "Controlled"), goal = "Spar weekly", isCoach = false),
        Person("p5", "Yuki T.", "Strength", 4.6, 18, null, false, 1.6, "Advanced", "55", "~1h",
            "Powerbuilding. Need a reliable spotter for heavy compound days — bench, squat, deadlift.",
            listOf("Spotter", "Powerbuilding", "Heavy days"), goal = "200kg deadlift", isCoach = false),
        Person("p6", "Rami S.", "Chess", 4.8, 14, null, false, 0.7, "~1500 ELO", "26", "~30m",
            "Café blitz addict around 1500. Looking for a regular over-the-board sparring partner, evenings in Achrafieh.",
            listOf("Blitz", "Over the board", "Evenings"), goal = "Blitz sparring", isCoach = false),
        Person("p7", "Lara M.", "Music & Vocals", 4.7, 11, null, false, 1.8, "Intermediate", "19", "~1h",
            "Singer looking for a guitarist or pianist to jam with weekly and maybe hit an open mic in Mar Mikhael.",
            listOf("Vocals", "Open mics", "Weekly jams"), goal = "Weekly jam sessions", isCoach = false),
    )

    fun everyone() = coaches + partners
    fun personById(id: String) = everyone().firstOrNull { it.id == id } ?: coaches.first()

    val sportNames = listOf("All", "Strength", "Boxing", "Running", "Climbing", "Yoga", "Calisthenics", "Music", "Chess")

    val personReviews = listOf(
        Review("Chris P.", "2 weeks ago", "CP", 5, "Pushed me harder than I push myself. Form cues were spot-on and I felt it the next day."),
        Review("Nadia R.", "1 month ago", "NR", 5, "Booking was effortless and the session flew by. Already rebooked for next week."),
        Review("Tom B.", "1 month ago", "TB", 4, "Great energy and clearly knows the craft. Highly recommend for anyone starting out."),
    )

    // ---- shops ----
    val shops = listOf(
        Shop("s1", "PaceLine Runners", "PL", Color(0xFF2A3A2E), "Running gear", 0.6, 4.8, 95, "10% off in-app", 42f, 58f, listOf(
            Product("Tempo Racer 2", 129, "shoe shot"), Product("Featherlight run cap", 18, "cap shot"),
            Product("Energy gels · 12 pack", 22, "gels shot"), Product("Reflective shell jacket", 74, "jacket shot"))),
        Shop("s2", "IronWorks Supply", "IW", Color(0xFF3A2E2A), "Strength & gym", 1.1, 4.7, 61, "Free delivery", 28f, 36f, listOf(
            Product("Cast dumbbell pair · 10 kg", 58, "dumbbell shot"), Product("Leather lifting belt", 42, "belt shot"),
            Product("Chalk blocks · 8 pack", 14, "chalk shot"), Product("Resistance band set", 27, "bands shot"))),
        Shop("s3", "Corner Ring", "CR", Color(0xFF3A2A33), "Boxing & MMA", 1.8, 4.9, 142, "15% first order", 62f, 28f, listOf(
            Product("Sparring gloves · 14 oz", 89, "gloves shot"), Product("Hand wraps · 4.5 m", 12, "wraps shot"),
            Product("Leather speed rope", 24, "rope shot"), Product("Gel mouthguard", 16, "guard shot"))),
        Shop("s4", "FlowState Studio", "FS", Color(0xFF2A333A), "Yoga & pilates", 2.3, 4.6, 58, "Bundle deals", 20f, 66f, listOf(
            Product("Cork yoga mat", 46, "mat shot"), Product("Alignment blocks · pair", 19, "blocks shot"),
            Product("Cotton yoga strap", 9, "strap shot"), Product("Studio bolster", 34, "bolster shot"))),
        Shop("s5", "Spoke & Sprocket", "SS", Color(0xFF333A2A), "Cycling", 3.4, 4.8, 77, "10% off in-app", 72f, 64f, listOf(
            Product("Road helmet", 85, "helmet shot"), Product("Clip-in pedals", 64, "pedals shot"),
            Product("Bottle cage duo", 15, "cage shot"), Product("Chain lube kit", 12, "lube shot"))),
        Shop("s6", "Baseline Racquets", "BR", Color(0xFF3A362A), "Tennis & padel", 4.2, 4.5, 39, "Free restring", 50f, 82f, listOf(
            Product("Graphite racquet", 119, "racquet shot"), Product("Pressureless balls · 12", 21, "balls shot"),
            Product("Overgrip · 3 pack", 8, "grip shot"), Product("Court duffel bag", 54, "bag shot"))),
    )
    fun shopById(id: String) = shops.firstOrNull { it.id == id } ?: shops.first()
    val shopCategories = listOf("Running", "Strength", "Boxing", "Yoga", "Cycling", "Tennis", "Other")

    // ---- communities ----
    val communities = listOf(
        Community("running", "Running", "RN", Color(0xFF1F3A36), "3.2k", "Runners of every pace — from first-5k to marathon. Group runs, pacing crews and race-day meetups.", true),
        Community("strength", "Strength", "ST", Color(0xFF22324A), "2.8k", "Barbell, powerlifting and hypertrophy. Spotters, PR attempts and weekly form check-ins.", true),
        Community("boxing", "Boxing", "BX", Color(0xFF3A2330), "1.6k", "Footwork, pad work and controlled sparring nights. All levels, all stances.", true),
        Community("climbing", "Climbing", "CL", Color(0xFF244046), "1.1k", "Bouldering and lead. Belay partners, projecting sessions and outdoor trips.", true),
        Community("yoga", "Yoga", "YG", Color(0xFF3A2E4D), "2.1k", "Vinyasa, mobility and breathwork. Recover, restore and move better together.", true),
        Community("calisthenics", "Calisthenics", "CA", Color(0xFF3A2A22), "1.4k", "Bodyweight skills — pull-ups to muscle-ups. Park-bar jams and skill sessions.", true),
        Community("music", "Music", "MU", Color(0xFF4A2338), "900", "Guitar, oud, vocals and everything in between. Jam circles, open mics and practice partners.", true),
        Community("chess", "Chess", "CH", Color(0xFF2F3A2A), "640", "From café blitz to rated tournaments. Sparring partners, coaches and weekly club nights.", false),
    )
    fun communityById(id: String) = communities.firstOrNull { it.id == id } ?: communities.first()

    val subGroups: Map<String, List<SubGroup>> = mapOf(
        "running" to listOf(SubGroup("run-downtown", "Corniche Runners", "Ain El Mreisseh", "420"), SubGroup("run-riverside", "Horsh Beirut Pacers", "Horsh Beirut", "310"), SubGroup("run-northpark", "Jounieh Bay Run Club", "Jounieh", "180")),
        "strength" to listOf(SubGroup("str-iron", "Hamra Lifters", "Hamra", "260"), SubGroup("str-east", "Bourj Hammoud Barbell", "Bourj Hammoud", "190"), SubGroup("str-harbor", "Sin El Fil Strength", "Sin El Fil", "140")),
        "boxing" to listOf(SubGroup("box-southpaw", "Mar Mikhael Boxing Crew", "Mar Mikhael", "150"), SubGroup("box-eastend", "Tripoli Boxing Club", "Tripoli", "120")),
        "climbing" to listOf(SubGroup("clb-boulderco", "Achrafieh Wall Climbers", "Achrafieh", "210"), SubGroup("clb-southwall", "Tannourine Rock Crew", "Tannourine", "160")),
        "yoga" to listOf(SubGroup("yog-sunrise", "Raouche Sunrise Flow", "Raouche", "240"), SubGroup("yog-harbor", "Batroun Yoga Collective", "Batroun", "170")),
        "calisthenics" to listOf(SubGroup("cal-parkbars", "Corniche Bars Crew", "Ramlet El Bayda", "200"), SubGroup("cal-westgate", "Byblos Street Workout", "Byblos", "130")),
        "music" to listOf(SubGroup("mus-jam", "Mar Mikhael Jam Circle", "Mar Mikhael", "160"), SubGroup("mus-hamra", "Hamra Acoustic Sessions", "Hamra", "120")),
        "chess" to listOf(SubGroup("chs-cafe", "Achrafieh Chess Café", "Achrafieh", "140"), SubGroup("chs-saida", "Saida Chess Club", "Saida", "90")),
    )
    fun subById(id: String): SubGroup? = subGroups.values.flatten().firstOrNull { it.id == id }

    val events = listOf(
        Event("ev1", "running", "run-downtown", "Meetup", "Saturday Long Run", "Sat 05 · 7:00 AM", "Corniche, Ain El Mreisseh", 18, "Jordan K."),
        Event("ev2", "running", "run-riverside", "Event", "Horsh Beirut 10k Time Trial", "Sun 06 · 8:30 AM", "Horsh Beirut track", 42, "Tariq Aziz"),
        Event("ev3", "strength", "str-iron", "Meetup", "Heavy Squat Session", "Wed 02 · 6:30 PM", "Iron Yard Gym, Hamra", 9, "Marcus Reyes"),
        Event("ev4", "climbing", "clb-boulderco", "Meetup", "Evening Bouldering Jam", "Thu 03 · 7:30 PM", "Urban Wall, Achrafieh", 14, "Mei Lin"),
        Event("ev5", "boxing", "box-southpaw", "Event", "Open Sparring Night", "Fri 04 · 6:00 PM", "Southpaw Gym, Mar Mikhael", 22, "Aïcha Bennani"),
        Event("ev6", "yoga", "yog-sunrise", "Meetup", "Sunrise Vinyasa by the Sea", "Sat 05 · 6:30 AM", "Raouche seaside lawn", 27, "Lena Hoffmann"),
        Event("ev7", "music", "mus-jam", "Meetup", "Open Mic & Jam Night", "Fri 04 · 8:00 PM", "Mar Mikhael backyard stage", 31, "Karim Haddad"),
        Event("ev8", "chess", "chs-cafe", "Event", "Blitz Tournament", "Sun 06 · 4:00 PM", "Achrafieh Chess Café", 24, "Nour Fakhoury"),
    )
    fun eventById(id: String) = events.firstOrNull { it.id == id } ?: events.first()

    // ---- chats ----
    val chats = listOf(
        Chat("m1", "Marcus Reyes", "MR", "Great session today 💪 same time Thursday?", "2m", 2, true),
        Chat("m2", "Mei Lin", "ML", "Meet at the south wall around 8?", "1h", 0, true),
        Chat("m3", "Jordan K.", "JK", "You crushed that pace! 🔥", "3h", 0, false),
        Chat("m4", "Aïcha Bennani", "AB", "Don't forget your wraps next time", "Yest", 0, false),
    )
    fun chatById(id: String) = chats.firstOrNull { it.id == id } ?: chats.first()

    val messages = listOf(
        Message("Hey! Ready for the strength block this week?", false),
        Message("Born ready 💪 Same 6:30 slot works?", true),
        Message("Locked in. We'll start with heavy squats, then accessories.", false),
        Message("Perfect. See you at Iron Yard.", true),
        Message("Bring your A-game. 🔥", false),
    )

    // ---- booking calendar (July 2026) ----
    const val monthLabel = "July 2026"
    const val firstDow = 3
    const val daysInMonth = 31
    const val todayNum = 1
    val slotDefs = listOf("6:30 AM", "8:00 AM", "12:00 PM", "5:30 PM", "6:30 PM", "7:30 PM")
    val fullDaysByCoach: Map<String, List<Int>> = mapOf(
        "c1" to listOf(3, 10, 17, 24), "c2" to listOf(6, 7, 20), "c3" to listOf(4, 11, 18, 25),
        "c4" to listOf(8, 22), "c5" to listOf(13, 27), "c6" to listOf(5, 19),
    )

    // ---- accounting ----
    const val revenue = 12480.0
    val marginDefs = listOf("session" to "Coach session commission", "shop" to "Shop sale commission", "boost" to "Boost fee margin")
    val shareDefs = listOf("alex" to "Alex Morgan (you)", "rima" to "Rima Haddad", "karim" to "Karim Saleh")
    val allAdmins = listOf("Alex Morgan (you)", "Rima Haddad", "Karim Saleh")

    val initialExpenses = listOf(
        Expense("e1", "Servers & infrastructure", 1240.0, "Monthly"),
        Expense("e2", "Payment processing", 610.0, "Monthly"),
        Expense("e3", "Marketing & ads", 980.0, "Monthly"),
        Expense("e4", "Support & moderation", 450.0, "Monthly"),
    )
    val initialHistory = listOf(
        HistoryEntry("Jun 28", "Expense updated", "Marketing & ads: \$860 → \$980 (Monthly)", "By Rima Haddad"),
        HistoryEntry("Jun 12", "Margins updated", "Coach session commission: 15% → 12%", "Approved by 3 admins · affected coaches notified"),
        HistoryEntry("May 30", "Payout distributed", "May net profit \$8,540 split 40 / 30 / 30", "Automatic"),
    )
    val recurHints = mapOf(
        "One-time" to "Logged once in the current month only.",
        "Weekly" to "Automatically re-added every week.",
        "Monthly" to "Automatically re-added every month.",
        "Yearly" to "Automatically re-added every year.",
    )
    val recurOptions = listOf("One-time", "Weekly", "Monthly", "Yearly")

    // ---- ads ----
    val ads = mapOf(
        "discover" to AdDef("discover", "StrideLab", "SL", Color(0xFF2A3A2E),
            "Marathon-ready running shoes, tested on Beirut roads",
            "Free gait analysis with every first pair at our Hamra store.",
            "Shop now", "Based on your hobbies: Running · your goal \"Run a marathon\""),
        "community" to AdDef("community", "FuelUp Nutrition", "FN", Color(0xFF3A322A),
            "20% off recovery packs for training crews",
            "Group orders for communities — delivered across Lebanon.",
            "Get offer", "Based on your communities: Running, Strength"),
    )
}
