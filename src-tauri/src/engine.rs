use rs_fsrs::{Card as FSRSCard, FSRS, Parameters, Rating, State};

#[derive(Debug, Clone)]
pub struct SM2Result {
    pub repetitions: i32,
    pub interval: i32,
    pub ease_factor: f64,
}

#[derive(Debug, Clone)]
pub struct FSRSReviewResult {
    pub stability: f64,
    pub difficulty: f64,
    pub interval: i32,
    pub repetitions: i32,
    pub lapses: i32,
    pub fsrs_state: i32,
    pub next_review_at: String,
    pub last_review_at: String,
}

pub fn sm2(quality: i32, repetitions: i32, interval: i32, ease_factor: f64) -> SM2Result {
    let mut reps = repetitions;
    let mut int = interval;
    let mut ease = ease_factor;

    if quality < 3 {
        reps = 0;
        int = 1;
    } else {
        if reps == 0 {
            int = 1;
        } else if reps == 1 {
            int = 6;
        } else {
            int = (int as f64 * ease).round() as i32;
        }
        reps += 1;
    }

    ease += 0.1 - (5 - quality) as f64 * (0.08 + (5 - quality) as f64 * 0.02);
    if ease < 1.3 {
        ease = 1.3;
    }

    SM2Result { repetitions: reps, interval: int, ease_factor: ease }
}

pub fn simple_rating(quality: i32, repetitions: i32, interval: i32, ease_factor: f64) -> SM2Result {
    let mapped = match quality {
        0 => 0,
        1 => 3,
        _ => 5,
    };
    sm2(mapped, repetitions, interval, ease_factor)
}

fn map_to_fsrs_rating(rating: i32) -> Rating {
    match rating {
        0 => Rating::Again,
        1 => Rating::Hard,
        _ => Rating::Good,
    }
}

fn build_fsrs_card(
    stability: f64,
    difficulty: f64,
    interval: i32,
    repetitions: i32,
    lapses: i32,
    fsrs_state: i32,
    next_review_at: &str,
    last_review_at: &str,
    now: &chrono::DateTime<chrono::Utc>,
) -> FSRSCard {
    let state = match fsrs_state {
        1 => State::Learning,
        2 => State::Review,
        3 => State::Relearning,
        _ => State::New,
    };

    let due = chrono::DateTime::parse_from_rfc3339(next_review_at)
        .map(|d| d.with_timezone(&chrono::Utc))
        .unwrap_or(*now);

    let last_review = if last_review_at.is_empty() {
        due
    } else {
        chrono::DateTime::parse_from_rfc3339(last_review_at)
            .map(|d| d.with_timezone(&chrono::Utc))
            .unwrap_or(due)
    };

    let elapsed_days = if state == State::New {
        0
    } else {
        (now.signed_duration_since(last_review)).num_days().max(0)
    };

    FSRSCard {
        due,
        stability,
        difficulty,
        elapsed_days,
        scheduled_days: interval as i64,
        reps: repetitions,
        lapses,
        state,
        last_review,
    }
}

pub fn build_fsrs_params(retention: Option<f64>, max_interval: Option<i32>, custom_w: Option<&str>) -> Parameters {
    let mut params = Parameters::default();
    if let Some(r) = retention {
        if (0.70..=0.95).contains(&r) {
            params.request_retention = r;
        }
    }
    if let Some(m) = max_interval {
        if m > 0 {
            params.maximum_interval = m;
        }
    }
    if let Some(json) = custom_w {
        if let Ok(w) = serde_json::from_str::<[f64; 19]>(json) {
            params.w = w;
        }
    }
    params
}

pub fn fsrs_review(
    stability: f64,
    difficulty: f64,
    interval: i32,
    repetitions: i32,
    lapses: i32,
    fsrs_state: i32,
    next_review_at: &str,
    last_review_at: &str,
    rating: i32,
    retention: Option<f64>,
    max_interval: Option<i32>,
    custom_w: Option<&str>,
) -> Result<FSRSReviewResult, String> {
    let now = chrono::Utc::now();
    let params = build_fsrs_params(retention, max_interval, custom_w);
    let fsrs = FSRS::new(params);

    let card = build_fsrs_card(
        stability, difficulty, interval, repetitions, lapses,
        fsrs_state, next_review_at, last_review_at, &now,
    );

    let fsrs_rating = map_to_fsrs_rating(rating);
    let result = fsrs.next(card, now, fsrs_rating);

    let new_card = result.card;
    let next_review = new_card.due.format("%Y-%m-%dT%H:%M:%S%.3fZ").to_string();
    let last_review_str = now.format("%Y-%m-%dT%H:%M:%S%.3fZ").to_string();
    let new_state = match new_card.state {
        State::Learning => 1,
        State::Review => 2,
        State::Relearning => 3,
        _ => 0,
    };

    Ok(FSRSReviewResult {
        stability: new_card.stability,
        difficulty: new_card.difficulty,
        interval: new_card.scheduled_days as i32,
        repetitions: new_card.reps,
        lapses: new_card.lapses,
        fsrs_state: new_state,
        next_review_at: next_review,
        last_review_at: last_review_str,
    })
}
