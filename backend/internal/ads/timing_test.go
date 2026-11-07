package ads

import (
	"testing"
	"time"
)

func ts(s string) time.Time {
	t, err := time.Parse(time.RFC3339Nano, s)
	if err != nil {
		panic(err)
	}
	return t
}

func TestConversionTime(t *testing.T) {
	click := ts("2026-11-07T21:21:59.4Z")
	now := ts("2026-11-07T23:00:00Z")
	msg := ts("2026-11-07T21:22:30Z")
	cases := []struct {
		name   string
		stage  string
		stored time.Time
		msgAt  *time.Time
		now    time.Time
		want   time.Time
	}{
		{"click keeps full precision", StageClick, ts("2026-11-07T21:21:00Z"), nil, now, click},
		{"same minute message", StageMessage, ts("2026-11-07T21:21:00Z"), nil, now, ts("2026-11-07T21:22:00.4Z")},
		{"message before click by skew", StageMessage, click.Add(-40 * time.Second), nil, now, click.Add(time.Second)},
		{"later message unchanged", StageMessage, click.Add(30 * time.Minute), nil, now, click.Add(30 * time.Minute)},
		{"future message clamped", StageMessage, now.Add(4 * time.Minute), nil, now, now},
		{"booking after message", StageAppointment, ts("2026-11-07T21:22:00Z"), &msg, now, msg.Add(time.Second)},
		{"booking after click without message", StageAppointment, ts("2026-11-07T21:20:00Z"), nil, now, click.Add(time.Second)},
	}
	for _, c := range cases {
		got := ConversionTime(c.stage, c.stored, click, c.msgAt, c.now)
		if !got.Equal(c.want) {
			t.Errorf("%s: got %s want %s", c.name, got.Format(time.RFC3339Nano), c.want.Format(time.RFC3339Nano))
		}
	}
}

func TestSaoPauloOffset(t *testing.T) {
	loc, err := time.LoadLocation("America/Sao_Paulo")
	if err != nil {
		t.Skip("tzdata missing")
	}
	for _, d := range []string{"2026-01-15T12:00:00Z", "2026-07-15T12:00:00Z", "2026-11-08T02:30:00Z"} {
		a := ts(d).In(loc).Format(time.RFC3339)
		b := ts(d).In(brt).Format(time.RFC3339)
		if a != b {
			t.Errorf("%s: tzdata %s fixed %s", d, a, b)
		}
	}
	if got := ts("2026-11-08T02:30:00Z").In(brt).Format(time.RFC3339); got != "2026-11-07T23:30:00-03:00" {
		t.Errorf("got %s", got)
	}
	in, err := time.ParseInLocation("2006-01-02T15:04", "2026-11-07T23:30", loc)
	if err != nil || !in.Equal(ts("2026-11-08T02:30:00Z")) {
		t.Errorf("parse in location: %v %v", in, err)
	}
}
