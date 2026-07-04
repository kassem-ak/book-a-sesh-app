package com.spotter.app.data

import androidx.compose.runtime.Immutable
import androidx.compose.ui.graphics.Color

@Immutable
data class Person(
    val id: String,
    val name: String,
    val sport: String,
    val rating: Double,
    val reviews: Int,
    val price: Int? = null,
    val boosted: Boolean = false,
    val distance: Double,
    val level: String,
    val sessions: String,
    val reply: String,
    val bio: String,
    val tags: List<String>,
    val goal: String? = null,
    val isCoach: Boolean,
) {
    val initials: String get() = name.split(" ").mapNotNull { it.firstOrNull()?.toString() }.take(2).joinToString("").uppercase()
    val firstName: String get() = name.split(" ").first()
    val ratingLabel: String get() = "%.1f".format(rating)
    val reviewsLabel: String get() = "($reviews)"
    val distanceLabel: String get() = "$distance km away"
    val priceLabel: String get() = "$" + (price ?: 0)
    val metaLabel: String get() = if (isCoach) "$sport · $distance km" else "$sport · ${goal ?: ""}"
}

@Immutable
data class Review(
    val name: String,
    val whenLabel: String,
    val initials: String,
    val stars: Int,
    val text: String,
)

@Immutable
data class Product(val name: String, val price: Int, val ph: String)

@Immutable
data class Shop(
    val id: String,
    val name: String,
    val initials: String,
    val tint: Color,
    val category: String,
    val dist: Double,
    val rating: Double,
    val reviews: Int,
    val deal: String,
    val pinTop: Float,
    val pinLeft: Float,
    val products: List<Product>,
) {
    val ratingLabel: String get() = "%.1f".format(rating)
    val reviewsLabel: String get() = "($reviews)"
    val distLabel: String get() = if (dist < 1) "${Math.round(dist * 1000)} m" else "${Math.round(dist * 10) / 10.0} km"
}

@Immutable
data class SubGroup(val id: String, val name: String, val area: String, val members: String)

@Immutable
data class Community(
    val id: String,
    val sport: String,
    val code: String,
    val tint: Color,
    val members: String,
    val about: String,
    val official: Boolean,
)

@Immutable
data class Event(
    val id: String,
    val communityId: String,
    val subId: String?,
    val type: String, // "Meetup" | "Event"
    val title: String,
    val whenLabel: String,
    val loc: String,
    val attendees: Int,
    val host: String,
) {
    val isMeetup: Boolean get() = type == "Meetup"
}

@Immutable
data class Chat(
    val id: String,
    val name: String,
    val initials: String,
    val last: String,
    val whenLabel: String,
    val unread: Int,
    val online: Boolean,
)

@Immutable
data class Message(val text: String, val me: Boolean)

@Immutable
data class Expense(val id: String, val label: String, val amt: Double, val recur: String)

@Immutable
data class HistoryEntry(val whenLabel: String, val title: String, val detail: String, val meta: String)

@Immutable
data class Margins(val session: Double, val shop: Double, val boost: Double) {
    operator fun get(key: String): Double = when (key) {
        "session" -> session; "shop" -> shop; else -> boost
    }
    fun with(key: String, value: Double): Margins = when (key) {
        "session" -> copy(session = value); "shop" -> copy(shop = value); else -> copy(boost = value)
    }
}

@Immutable
data class Shares(val alex: Double, val rima: Double, val karim: Double) {
    operator fun get(key: String): Double = when (key) {
        "alex" -> alex; "rima" -> rima; else -> karim
    }
    fun with(key: String, value: Double): Shares = when (key) {
        "alex" -> copy(alex = value); "rima" -> copy(rima = value); else -> copy(karim = value)
    }
}

@Immutable
data class MarginsShares(val margins: Margins, val shares: Shares)

@Immutable
data class Proposal(
    val to: MarginsShares,
    val lines: List<String>,
    val approvals: List<String>,
)

@Immutable
data class Notif(val whenLabel: String, val title: String, val body: String)

@Immutable
data class AdDef(
    val key: String,
    val brand: String,
    val logo: String,
    val tint: Color,
    val headline: String,
    val body: String,
    val cta: String,
    val why: String,
)

enum class Role { USER, COACH, ADMIN }

enum class CalProvider(val label: String) { GOOGLE("Google"), APPLE("Apple"), OUTLOOK("Outlook") }
